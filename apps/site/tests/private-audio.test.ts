import '../scripts/env';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../lib/config';
import { createPool } from '../lib/database';
import { migrate } from '../lib/migrations';
import { localAudioStore } from '../lib/audio-store';
import { PrivateAudio, storageLimits } from '../lib/private-audio';
import { listTracks } from '../lib/library';
import { audioFixture, input } from './audio-fixture';

test('real isolated Postgres and disk: private audio lifecycle and recovery',async t=>{
  const config=readConfig(); assert.equal(config.local,true); assert.ok(config.outbox);
  const admin=createPool(config.databaseURL), name='djayvo_test_'+randomUUID().replaceAll('-','');
  await admin.query(`CREATE DATABASE "${name}"`);
  const url=new URL(config.databaseURL);url.pathname='/'+name;
  const pool=createPool(url.toString()), directory=await mkdtemp(join(tmpdir(),'djayvo-audio-'));
  const store=localAudioStore(directory), audio=new PrivateAudio(pool,store), wav=audioFixture();
  try {
    await migrate(pool);
    for(const owner of ['alice','bob','quota']) await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);
    const request=input(wav), intent=await audio.reserve('alice',request);
    await t.test('explicit reservation, retry identity, owner binding and unavailable pending audio',async()=>{
      assert.equal((await audio.reserve('alice',request)).id,intent.id);
      await assert.rejects(audio.reserve('alice',{...request,title:'changed'}),/changed/);
      await assert.rejects(audio.localUpload('bob',intent.id,wav),/not found/);
      await assert.rejects(audio.playback('alice',intent.id),/not found/);
      assert.equal((await listTracks(pool,'alice')).tracks.length,0);
      const bad=Buffer.from(wav);bad[44]^=1;
      await assert.rejects(audio.localUpload('alice',intent.id,bad),/does not match/);
      await assert.rejects(audio.finalize('alice',intent.id));
    });
    await t.test('finalization recovers from object write before SQL failure; retry and replay cannot change final bytes',async()=>{
      await audio.localUpload('alice',intent.id,wav);
      const crashing=new PrivateAudio(pool,{...store,async put(key,data){await store.put(key,data);throw new Error('simulated crash after write');}});
      await assert.rejects(crashing.finalize('alice',intent.id),/simulated crash/);
      assert.equal((await listTracks(pool,'alice')).tracks.length,0);
      await Promise.all([audio.finalize('alice',intent.id),audio.finalize('alice',intent.id)]);
      assert.equal((await listTracks(pool,'alice')).tracks[0].playable,true);
      assert.equal((await listTracks(pool,'bob')).tracks.length,0);
      assert.deepEqual((await audio.playback('alice',intent.id)).data,wav);
      await assert.rejects(audio.localUpload('alice',intent.id,wav),/no longer/);
      await store.put(`uploads/${intent.id}.wav`,Buffer.from('late replay'));
      await audio.finalize('alice',intent.id);
      assert.deepEqual((await audio.playback('alice',intent.id)).data,wav);
      await assert.rejects(audio.playback('bob',intent.id),/not found/);
      await assert.rejects(audio.remove('bob',intent.id),/not found/);
    });
    await t.test('concurrent quota reservations cannot oversubscribe owner or global byte allowance',async()=>{
      const outcomes=await Promise.allSettled(Array.from({length:12},()=>audio.reserve('quota',input(wav))));
      assert.equal(outcomes.filter(v=>v.status==='fulfilled').length,10);
      const old=storageLimits.totalBytes;storageLimits.totalBytes=1;
      try{await assert.rejects(audio.reserve('bob',input(wav)),/at its limit/);}finally{storageLimits.totalBytes=old;}
    });
    await t.test('delete hides immediately, waits out grants, retains retry records and releases quota only after cleanup',async()=>{
      await audio.remove('alice',intent.id);
      assert.equal((await listTracks(pool,'alice')).tracks.length,0);
      await assert.rejects(audio.playback('alice',intent.id),/not found/);
      await assert.rejects(audio.finalize('alice',intent.id),/no longer/);
      assert.equal((await audio.cleanup()).cleaned,0);
      await pool.query("UPDATE track_assets SET expires_at=now()-interval '2 minutes' WHERE track_id=$1",[intent.id]);
      const broken=new PrivateAudio(pool,{...store,async remove(){throw new Error('storage unavailable');}});
      assert.equal((await broken.cleanup()).failed,1);
      assert.equal((await pool.query('SELECT state FROM track_assets WHERE track_id=$1',[intent.id])).rows[0].state,'deleting');
      assert.equal((await audio.cleanup()).cleaned,1);
      await assert.rejects(store.get(`masters/${intent.id}.wav`,wav.length));
      await assert.rejects(store.get(`uploads/${intent.id}.wav`,wav.length));
      await audio.remove('alice',intent.id);
      await assert.rejects(audio.reserve('alice',request),/no longer/);
    });
    await t.test('expiry prevents uploads, abandoned reservation cleanup and ready staging cleanup are bounded',async()=>{
      const ready=await audio.reserve('bob',input(wav));await audio.localUpload('bob',ready.id,wav);await audio.finalize('bob',ready.id);
      await pool.query("UPDATE track_assets SET expires_at=now()-interval '2 minutes' WHERE state<>'deleted'");
      const expired=(await pool.query("SELECT track_id FROM track_assets WHERE owner_id='quota' LIMIT 1")).rows[0].track_id;
      await assert.rejects(audio.localUpload('quota',expired,wav),/expired/);
      await assert.rejects(audio.finalize('quota',expired),/expired/);
      assert.equal((await audio.cleanup(3)).checked,3);
      assert.equal((await audio.cleanup()).failed,0);
      assert.deepEqual((await audio.playback('bob',ready.id)).data,wav);
      await assert.rejects(store.get(`uploads/${ready.id}.wav`,wav.length));
      assert.equal((await audio.cleanup()).checked,0);
      assert.equal((await audio.reserve('quota',input(wav))).ready,false);
      await assert.rejects(pool.query('DELETE FROM "user" WHERE id=$1',['bob']),/foreign key/);
    });
    await t.test('daily attempt budgets include deleted reservations',async()=>{
      const owner=storageLimits.ownerDaily,global=storageLimits.totalDaily;
      try {
        storageLimits.ownerDaily=10;
        await assert.rejects(audio.reserve('quota',input(wav)),/at its limit/);
        storageLimits.ownerDaily=owner;storageLimits.totalDaily=1;
        await assert.rejects(audio.reserve('alice',input(wav)),/at its limit/);
      } finally { storageLimits.ownerDaily=owner;storageLimits.totalDaily=global; }
    });
  } finally {await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(directory,{recursive:true,force:true});}
});
