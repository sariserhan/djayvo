import '../scripts/env';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPool } from '../lib/database';
import { readConfig } from '../lib/config';
import { migrate } from '../lib/migrations';
import { localAudioStore } from '../lib/audio-store';
import { PrivateAudio } from '../lib/private-audio';
import { Catalogue } from '../lib/catalogue';
import { audioFixture,input } from './audio-fixture';

test('isolated catalogue: explicit publication, revision-bound review and private playlists',async t=>{
  const config=readConfig();assert.equal(config.local,true);assert.ok(config.outbox);
  const admin=createPool(config.databaseURL),name='djayvo_test_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);
  const url=new URL(config.databaseURL);url.pathname='/'+name;
  const pool=createPool(url.toString()),dir=await mkdtemp(join(tmpdir(),'djayvo-catalogue-'));
  const audio=new PrivateAudio(pool,localAudioStore(dir)),catalogue=new Catalogue(pool,audio),wav=audioFixture();
  const submission={artist:'Public test credit',description:'Original test mix for local checks',mood:'playful',consent:true};
  try {
    await migrate(pool);
    for(const id of ['owner','listener','reviewer'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,id+'@example.com']);
    const {id}=await audio.reserve('owner',input(wav));await audio.localUpload('owner',id,wav);await audio.finalize('owner',id);
    await t.test('private and pending tracks never enter public metadata or audio',async()=>{
      assert.equal((await catalogue.list()).tracks.length,0);await assert.rejects(catalogue.playback(id),/not found/);
      await assert.rejects(catalogue.submit('owner',id,{...submission,consent:false}),/permission/);
      await assert.rejects(catalogue.submit('listener',id,submission),/not found/);
      await catalogue.submit('owner',id,submission);
      assert.equal((await catalogue.list()).tracks.length,0);await assert.rejects(catalogue.playback(id),/not found/);
      assert.equal((await catalogue.queue()).length,1);
    });
    await t.test('self review and stale revisions fail; explicit review exposes only public fields',async()=>{
      const first=(await catalogue.queue())[0];
      await assert.rejects(catalogue.review('owner',id,'approved','self',first.revision),/different reviewer/);
      await catalogue.submit('owner',id,{...submission,description:'Revised local test description\nWith a second line'});
      await assert.rejects(catalogue.review('reviewer',id,'approved','stale',first.revision),/changed/);
      const second=(await catalogue.queue())[0];await catalogue.review('reviewer',id,'approved','Synthetic test only; not human listening evidence',second.revision);
      const found=await catalogue.track(id);
      assert.equal(found.description,'Revised local test description\nWith a second line');
      await assert.rejects(catalogue.submit('owner',id,{...submission,artist:'Bad\ncredit'}),/Invalid text/);
      await assert.rejects(catalogue.submit('owner',id,{...submission,description:'Bad\u0000control'}),/Invalid text/);
      assert.deepEqual(Object.keys(found).sort(),['artist','description','duration_ms','id','mood','strategy','title']);
      assert.deepEqual((await catalogue.playback(id)).data,wav);
      assert.equal((await catalogue.list('Revised','funk','playful')).tracks.length,1);
      assert.equal((await catalogue.list('%')).tracks.length,0);
      assert.equal((await catalogue.list("' OR true --")).tracks.length,0);
      await assert.rejects(catalogue.list('','invalid'));
      assert.equal((await pool.query('SELECT count(*)::int n FROM catalogue_reviews')).rows[0].n,1);
    });
    const playlist=await catalogue.createPlaylist('listener','My private collection');
    await t.test('playlists isolate owners, preserve ordering, deduplicate and cannot add private tracks',async()=>{
      await catalogue.changePlaylist('listener',playlist.id,id);await catalogue.changePlaylist('listener',playlist.id,id);
      assert.equal((await catalogue.playlist('listener',playlist.id)).tracks.length,1);
      await assert.rejects(catalogue.playlist('owner',playlist.id),/not found/);
      await assert.rejects(catalogue.changePlaylist('owner',playlist.id,id,true),/not found/);
      await assert.rejects(catalogue.changePlaylist('owner',playlist.id,undefined,true),/not found/);
      const hidden=await audio.reserve('owner',input(wav));
      await assert.rejects(catalogue.changePlaylist('listener',playlist.id,hidden.id),/not found/);
    });
    await t.test('reports reopen moderation; rejection removes public audio and playlist playback without deleting the private master',async()=>{
      await catalogue.report('listener',id,'Permission concern in synthetic fixture');
      assert.equal((await catalogue.queue())[0].reports,1);
      const current=(await catalogue.queue())[0];await catalogue.review('reviewer',id,'rejected','Removed for fixture test',current.revision);
      assert.equal((await catalogue.list()).tracks.length,0);await assert.rejects(catalogue.playback(id),/not found/);
      assert.equal((await catalogue.playlist('listener',playlist.id)).tracks.length,0);
      assert.deepEqual((await audio.playback('owner',id)).data,wav);
      assert.equal((await catalogue.queue()).length,0);
    });
    await t.test('a new report invalidates a loaded review so unseen concerns cannot be resolved',async()=>{
      await catalogue.submit('owner',id,submission);
      const pending=(await catalogue.queue())[0];
      await catalogue.review('reviewer',id,'approved','Synthetic workflow',pending.revision);
      await catalogue.report('listener',id,'First concern');
      const loaded=(await catalogue.queue())[0];
      await catalogue.report('listener',id,'Updated concern after reviewer loaded');
      await assert.rejects(catalogue.review('reviewer',id,'approved','Stale screen',loaded.revision),/changed/);
      const fresh=(await catalogue.queue())[0];
      assert.deepEqual(fresh.reasons,['Updated concern after reviewer loaded']);
      await catalogue.review('reviewer',id,'approved','Reviewed current concern',fresh.revision);
      assert.equal((await catalogue.queue()).length,0);
    });
    await t.test('review resolves only the displayed ten reports and invalidates the old screen',async()=>{
      for(let i=0;i<11;i++){
        const reporter='batch-reporter-'+i;
        await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[reporter,reporter+'@example.com']);
        await catalogue.report(reporter,id,'Batch concern '+i);
      }
      const loaded=(await catalogue.queue())[0];assert.equal(loaded.reports,11);assert.equal(loaded.reasons.length,10);
      await catalogue.review('reviewer',id,'approved','Read ten displayed concerns',loaded.revision);
      const remaining=(await catalogue.queue())[0];assert.equal(remaining.reports,1);assert.equal(remaining.reasons.length,1);
      assert.ok(!loaded.reasons.includes(remaining.reasons[0]));
      await assert.rejects(catalogue.review('reviewer',id,'approved','Repeat stale review',loaded.revision),/changed/);
      await catalogue.review('reviewer',id,'approved','Read final concern',remaining.revision);
      assert.equal((await catalogue.queue()).length,0);
      await pool.query(`DELETE FROM "user" WHERE id LIKE 'batch-reporter-%'`);
    });
    await t.test('reciprocal reports serialize without deadlocks and stay visible after concurrent review',async()=>{
      const other=await audio.reserve('listener',input(wav));await audio.localUpload('listener',other.id,wav);await audio.finalize('listener',other.id);
      await catalogue.submit('listener',other.id,submission);
      const queued=(await catalogue.queue()).find(t=>t.id===other.id);
      await catalogue.review('reviewer',other.id,'approved','Synthetic workflow',queued.revision);
      await Promise.all([catalogue.report('listener',id,'Reciprocal A'),catalogue.report('owner',other.id,'Reciprocal B')]);
      const loaded=(await catalogue.queue()).find(t=>t.id===id);
      const result=await Promise.allSettled([
        catalogue.review('reviewer',id,'approved','Concurrent review',loaded.revision),
        catalogue.report('reviewer',id,'New reviewer concern')
      ]);
      assert.equal(result[1].status,'fulfilled');
      if(result[0].status==='rejected')assert.match(String(result[0].reason),/changed/);
      assert.ok((await catalogue.queue()).find(t=>t.id===id).reasons.includes('New reviewer concern'));
      for(const row of await catalogue.queue())await catalogue.review('reviewer',row.id,'approved','Fresh synthetic review',row.revision);
      await audio.remove('listener',other.id);
    });
    await t.test('reported withdrawal leaves the actionable queue without erasing report history',async()=>{
      await catalogue.submit('owner',id,submission);
      const pending=(await catalogue.queue())[0];
      await catalogue.review('reviewer',id,'approved','Synthetic workflow',pending.revision);
      await catalogue.report('listener',id,'Retain this concern if resubmitted');
      await catalogue.withdraw('owner',id);
      assert.equal((await catalogue.queue()).length,0);
      assert.equal((await pool.query('SELECT resolved FROM catalogue_reports WHERE track_id=$1',[id])).rows[0].resolved,false);
      await catalogue.submit('owner',id,submission);
      assert.deepEqual((await catalogue.queue())[0].reasons,['Retain this concern if resubmitted']);
    });
    await t.test('withdrawal wins against concurrent approval and owner deletion prevents public access',async()=>{
      await catalogue.submit('owner',id,submission);let row=(await catalogue.queue())[0];
      await Promise.allSettled([catalogue.review('reviewer',id,'approved','race fixture',row.revision),catalogue.withdraw('owner',id)]);
      await assert.rejects(catalogue.track(id),/not found/);
      await catalogue.submit('owner',id,submission);row=(await catalogue.queue())[0];await catalogue.review('reviewer',id,'approved','fixture',row.revision);
      await audio.remove('owner',id);await assert.rejects(catalogue.track(id),/not found/);await assert.rejects(catalogue.playback(id),/not found/);
      assert.equal((await catalogue.playlist('listener',playlist.id)).tracks.length,0);
    });
    await t.test('playlist count limits survive concurrent creates; deletion is scoped',async()=>{
      const result=await Promise.allSettled(Array.from({length:22},(_,i)=>catalogue.createPlaylist('owner','Collection '+i)));
      assert.equal(result.filter(r=>r.status==='fulfilled').length,20);
      await catalogue.changePlaylist('listener',playlist.id,undefined,true);
      assert.equal((await catalogue.playlists('listener')).length,0);
    });
    await t.test('catalogue cursor pages are disjoint and full-playlist retries stay idempotent',async()=>{
      // Metadata-only query fixtures; these rows are never served or used as audio evidence.
      const tracks=(await pool.query("INSERT INTO tracks(owner_id,title,strategy,duration_ms) SELECT 'reviewer','Pagination fixture '||n,'club',20000 FROM generate_series(1,101) n RETURNING id")).rows;
      for(const track of tracks){
        await pool.query("INSERT INTO track_assets(track_id,request_id,owner_id,sha256,bytes,state) VALUES($1,gen_random_uuid(),'reviewer',$2,$3,'ready')",[track.id,input(wav).sha256,wav.length]);
        await pool.query("INSERT INTO catalogue_submissions(track_id,artist,description,mood,state) VALUES($1,'Test','Query-only fixture','chill','approved')",[track.id]);
      }
      const seen=new Set<string>();let cursor='';
      do {const page=await catalogue.list('Pagination','club','chill',cursor);for(const track of page.tracks){assert.ok(!seen.has(track.id));seen.add(track.id);}cursor=page.next??'';}while(cursor);
      assert.equal(seen.size,101);
      const list=await catalogue.createPlaylist('listener','Full collection');
      await pool.query('INSERT INTO playlist_items(playlist_id,track_id) SELECT $1,id FROM tracks WHERE id=ANY($2::uuid[])',[list.id,tracks.slice(0,100).map(t=>t.id)]);
      await catalogue.changePlaylist('listener',list.id,tracks[0].id);
      await assert.rejects(catalogue.changePlaylist('listener',list.id,tracks[100].id),/full/);
      await catalogue.withdraw('reviewer',tracks[0].id);
      const partial=await catalogue.playlist('listener',list.id);
      assert.equal(partial.tracks.length,99);
      assert.deepEqual(partial.unavailable,[{id:tracks[0].id}]);
      await assert.rejects(catalogue.changePlaylist('owner',list.id,tracks[0].id,true),/not found/);
      await catalogue.changePlaylist('listener',list.id,partial.unavailable[0].id,true);
      await catalogue.changePlaylist('listener',list.id,tracks[100].id);
      assert.equal((await catalogue.playlist('listener',list.id)).tracks.length,100);
      assert.deepEqual((await catalogue.playlist('listener',list.id)).unavailable,[]);
    });
  }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(dir,{recursive:true,force:true});}
});
