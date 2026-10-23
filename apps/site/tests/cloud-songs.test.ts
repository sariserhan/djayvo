import {emptyTaste} from '../lib/taste';
import {cloudSongFeedback,cloudPersonalFeedback} from '../lib/cloud-song-feedback';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {DnaCommerce} from '../lib/dna-commerce';
import {CloudSongs,checkSource} from '../lib/cloud-songs';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {cloudSongAPI} from '../lib/cloud-song-api';
import {localAudioStore} from '../lib/audio-store';
import {Wallet} from '../lib/wallet';
import type {RunpodJob,RunpodResult} from '../lib/runpod-provider';
const id=()=>randomUUID().replaceAll('-',''),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const profile={references:['Heavy song'],referenceMetadata:[{reference:'Heavy song',genre:'Metal',source:'itunes' as const}],vocalLanguage:'en'};
test('cloud song configuration is opt-in and requires a bounded rate',()=>{
 assert.equal(cloudSongConfig({}),null);
 assert.throws(()=>cloudSongConfig({VERCEL:'1',JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_ENDPOINT_ID:'fixture',RUNPOD_API_KEY:'secret',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'500'}),/live credits/);
 for(const rate of ['','NaN','0','1001'])assert.throws(()=>cloudSongConfig({JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_ENDPOINT_ID:'fixture',RUNPOD_API_KEY:'secret',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:rate}));
 assert.throws(()=>checkSource(Buffer.alloc(44),44,'0'.repeat(64)));
});
test('real Postgres cloud songs: concurrency, credits, recovery, privacy, cancellation and ambiguous submission',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_cloud_'+id();await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.href),directory=await mkdtemp(join(tmpdir(),'jamloom-cloud-')),store=localAudioStore(directory);
 const settings=cloudSongConfig({JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_ENDPOINT_ID:'fixture',RUNPOD_API_KEY:'secret',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'500'})!;
 const commerce=new DnaCommerce(pool,'fixture-secret-'.repeat(4),store,{budget:settings.budget});
 const jobs=new Map<string,RunpodJob>(),results=new Map<string,RunpodResult>();let submits=0,ambiguous=false,failStorage=false;
 const provider={submit:async(job:RunpodJob)=>{submits++;jobs.set(job.id,job);if(ambiguous)throw Error('Lost response');const result:RunpodResult={id:'provider-'+job.id,status:'IN_QUEUE'};results.set(result.id,result);return result;},status:async(id:string)=>{const r=results.get(id);if(!r)throw Error('Missing provider record');return r;},cancel:async(id:string)=>{const result:RunpodResult={id,status:'CANCELLED'};results.set(id,result);return result;},health:async()=>({jobs:{inQueue:0,inProgress:0}})};
 const songs=new CloudSongs(commerce,settings,provider),storePut=store.put;
 store.put=async(key,audio)=>{if(failStorage&&!key.startsWith('uploads/'))throw Error('Storage unavailable');await storePut(key,audio);};
 const submit=async(owner:string,visibility:'public'|'private'='public')=>{const key=id(),quote=await commerce.quote(owner,profile,visibility);await songs.submit(owner,key,profile,visibility,quote.token);return key;};
 const complete=async(key:string)=>{
  const row=(await pool.query('SELECT output_key FROM cloud_song_runs WHERE id=$1',[key])).rows[0],audio=Buffer.alloc(120*192000+44);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(48000,24);audio.writeUInt32LE(192000,28);audio.writeUInt16LE(4,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);
  for(let i=44;i<audio.length;i+=2)audio.writeInt16LE(Math.round(2000*Math.sin(i/100)),i);
  await store.put(row.output_key,audio);results.set('provider-'+key,{id:'provider-'+key,status:'COMPLETED',executionTime:48000,delayTime:12000,output:{schema:'jamloom-runpod-1',id:key,product:'music-dna',audio_bytes:audio.length,audio_sha256:sha(audio),plan:{title:'Original song',direction:{id:'heavy-rock'},language:{code:'en',label:'English',country:'PRIVATE',votes:{private:1}},cases:[{lyrics:'Original lyrics'}]},fit:{accepted:true,target:'heavy-rock',audio_sha256:sha(audio)}}});
 };
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(let i=0;i<8;i++){const owner='user'+i;await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await commerce.wallet.grant(owner,{provider:'stripe_test',receipt:owner,credits:50,netMicros:30000000});}
  await t.test('one request is reserved and dispatched once under duplicate concurrent calls',async()=>{
   const key=id(),quote=await commerce.quote('user0',profile,'public');
   await Promise.all(Array.from({length:8},()=>songs.submit('user0',key,profile,'public',quote.token)));
   const before=submits;await Promise.all(Array.from({length:8},()=>songs.tick(key)));assert.equal(submits-before,1);assert.equal((await songs.status('user0',key)).state,'queued');
   await assert.rejects(songs.status('user1',key),/not found/);
   await assert.rejects(songs.submit('user0',key,{...profile,vocalLanguage:'tr'},'public',quote.token),/different/);
   await songs.cancel('user0',key);assert.deepEqual(await commerce.wallet.balance('user0'),{available:50,reserved:0});
  });
  await t.test('several users queue independently; cancellation refunds while other songs continue',async()=>{
   const keys=await Promise.all([1,2,3].map(n=>submit('user'+n)));await Promise.all(keys.map(key=>songs.tick(key)));
   for(const key of keys)assert.equal((await commerce.row(key)).state,'queued');
   await songs.cancel('user1',keys[0]);assert.equal((await commerce.row(keys[1])).state,'queued');
   for(let i=1;i<keys.length;i++){await complete(keys[i]);await songs.tick(keys[i]);assert.equal((await commerce.row(keys[i])).state,'completed');}
  });
  await t.test('restart after output storage failure uses persisted receipt and charges only once',async()=>{
   const key=await submit('user0','private');await songs.tick(key);await complete(key);failStorage=true;await assert.rejects(songs.tick(key),/Storage/);failStorage=false;
   results.delete('provider-'+key);const restarted=new CloudSongs(commerce,settings,provider);await restarted.tick(key);await restarted.tick(key);
   const row=await commerce.row(key);assert.equal(row.state,'completed');assert.match(row.audio_key,/music-dna\/private\//);assert.equal((await commerce.wallet.balance('user0')).reserved,0);
   assert.ok((await store.get(row.audio_key,row.audio_bytes)).length>44);
   const req=(owner:string|null)=>cloudSongAPI(new Request('http://localhost/api/taste/song?id='+key),songs,owner,()=>{});
   assert.equal((await req('user1'))?.status,404);assert.equal((await req(null))?.status,404);assert.equal((await req('user0'))?.status,200);
  });
  await t.test('failed jobs refund all credits and invalid completed output cannot become public',async()=>{
   const key=await submit('user4');await songs.tick(key);results.set('provider-'+key,{id:'provider-'+key,status:'FAILED',executionTime:50000,failure:'style-rejected:matched-2-of-4'});await songs.tick(key);assert.deepEqual(await commerce.wallet.balance('user4'),{available:50,reserved:0});
   assert.equal((await pool.query('SELECT provider_receipt FROM cloud_song_runs WHERE id=$1',[key])).rows[0].provider_receipt.failure,'style-rejected:matched-2-of-4');
   const bad=await submit('user4');await songs.tick(bad);await complete(bad);results.get('provider-'+bad)!.output!.audio_sha256='0'.repeat(64);await songs.tick(bad);assert.equal((await commerce.row(bad)).state,'failed');
   assert.ok(!(await commerce.list(null,'public')).songs.some(s=>s.id===bad));
  });
  await t.test('website input, feedback ownership, personalization and consent withdrawal',async()=>{
   const validated=await songs.input('user7',{...emptyTaste,...profile});assert.deepEqual(validated,profile);
   const request=(body:unknown)=>new Request('http://localhost/api/taste/song',{method:'POST',headers:{Origin:'http://localhost','X-Jamloom-DNA':'1','Content-Type':'application/json'},body:JSON.stringify(body)});
   assert.equal((await cloudSongAPI(request({action:'quote',profile:null,visibility:'private'}),songs,'user7',()=>{}))?.status,400);
   const key=await submit('user7');await songs.tick(key);await complete(key);await songs.tick(key);
   const feedback={rating:'like',tags:['vocals'],personalize:true,trainingConsent:true};
   const req=(method:string,body?:unknown,id=key)=>new Request('http://localhost/api/taste/feedback'+(id?'?id='+id:''),{method,headers:{Origin:'http://localhost','X-Jamloom-DNA':'1','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   assert.equal((await cloudSongFeedback(req('POST',feedback),{commerce,owner:'user6'})).status,403);
   assert.equal((await cloudSongFeedback(req('POST',feedback),{commerce,owner:'user7'})).status,200);
   assert.equal((await cloudPersonalFeedback({commerce,owner:'user7'},'heavy-rock','en')).length,1);
   assert.equal((await cloudPersonalFeedback({commerce,owner:'user6'},'heavy-rock','en')).length,0);
   const publicSong=await(await cloudSongAPI(new Request('http://localhost/api/taste/song?id='+key),songs,null,()=>{}))!.json();
   assert.equal(publicSong.profile,undefined);assert.deepEqual(publicSong.plan.language,{code:'en',label:'English'});
   assert.equal((await cloudSongFeedback(req('DELETE',undefined,''),{commerce,owner:'user7'})).status,200);
   assert.equal((await cloudPersonalFeedback({commerce,owner:'user7'},'heavy-rock','en')).length,0);
   const liveCommerce=new DnaCommerce(pool,'fixture-secret-'.repeat(4),store,{live:true});
   assert.equal(await liveCommerce.row(key),undefined);assert.equal((await liveCommerce.list(null,'public')).songs.length,0);
  });
  await t.test('lost submit response never retries paid work; quiet endpoint after TTL releases reservation',async()=>{
   const key=await submit('user5');ambiguous=true;const before=submits;await assert.rejects(songs.tick(key));ambiguous=false;
   await songs.tick(key);assert.equal(submits,before+1);assert.equal((await commerce.row(key)).state,'queued');
   await pool.query("UPDATE cloud_song_runs SET deadline=now()-interval '3 minutes' WHERE id=$1",[key]);await songs.tick(key);assert.equal((await commerce.row(key)).state,'failed');assert.deepEqual(await commerce.wallet.balance('user5'),{available:50,reserved:0});
  });
  await t.test('test credit lots cannot fund live requests or inflate live balances',async()=>{
   const live=new Wallet(pool,true);assert.deepEqual(await live.balance('user6'),{available:0,reserved:0});await assert.rejects(live.quote('user6',10000),/Insufficient/);
   await live.grant('user6',{provider:'stripe_live',receipt:'live-fixture',credits:10,netMicros:6000000});assert.deepEqual(await live.balance('user6'),{available:10,reserved:0});assert.deepEqual(await commerce.wallet.balance('user6'),{available:50,reserved:0});
   await assert.rejects(commerce.wallet.grant('user6',{provider:'stripe_live',receipt:'wrong-mode',credits:10,netMicros:6000000}),/Invalid/);
  });
  await t.test('recovery rotates ambiguous jobs and releases credits after persistent storage failure',async()=>{
   const keys=await Promise.all([0,1,2].map(n=>submit('user'+n)));
   ambiguous=true;for(const key of keys.slice(0,2))await assert.rejects(songs.tick(key));ambiguous=false;
   await pool.query("UPDATE cloud_song_runs SET updated_at=now()-interval '1 hour' WHERE id=ANY($1::text[])",[keys.slice(0,2)]);
   await songs.sweep();await songs.sweep();assert.ok(jobs.has(keys[2]));
   await complete(keys[2]);failStorage=true;await assert.rejects(songs.tick(keys[2]),/Storage/);failStorage=false;
   await pool.query("UPDATE cloud_song_runs SET deadline=now()-interval '3 minutes' WHERE id=ANY($1::text[])",[keys]);
   for(const key of keys){await songs.tick(key);assert.equal((await commerce.row(key)).state,'failed');}
   for(const n of [0,1,2])assert.equal((await commerce.wallet.balance('user'+n)).reserved,0);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(directory,{recursive:true,force:true});}
});
