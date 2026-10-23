import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {DnaCommerce,visibilityInput} from '../lib/dna-commerce';
import {dnaSong} from '../lib/dna-song';
import {dnaFeedback} from '../lib/dna-feedback-api';
import {musicDirection} from '../lib/taste-direction';
import {localAudioStore} from '../lib/audio-store';
import {storedDnaSong} from '../lib/dna-stored-song';
const profile={references:['Private favorite — Private artist'],referenceMetadata:[{reference:'Private favorite — Private artist',genre:'Pop',source:'itunes' as const}],vocalLanguage:'en'};
const id=()=>randomUUID().replaceAll('-',''),sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const request=(query:string,method='GET',body?:unknown)=>new Request('http://127.0.0.1:4247/api/taste/song'+query,{method,headers:{'X-Jamloom-DNA':'1',origin:'http://127.0.0.1:4247','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
test('DNA requires explicit visibility and public-sharing permission',()=>{
 assert.equal(visibilityInput('public',true),'public');assert.equal(visibilityInput('private',false),'private');
 for(const [value,consent] of [['public',false],['private',true],['public','true'],['anything',true]])assert.throws(()=>visibilityInput(value,consent));
});
test('real Postgres Music DNA credits, privacy, idempotence, failure and recovery',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_dna_'+id();await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),commerce=new DnaCommerce(pool,'local-dna-test-secret-'.repeat(3));
 const root=await mkdtemp(join(tmpdir(),'jamloom-dna-billing-')),old=process.env.JAMLOOM_DNA_SINGER_ROOT;
 process.env.JAMLOOM_DNA_SINGER_ROOT=root;
 async function output(job:string){
  const work=join(root,'renders/music-dna-songs',job);await mkdir(join(work,'singer'),{recursive:true});
  const direction=musicDirection(profile),input=JSON.stringify({profile,direction,seed:1}),audio=Buffer.alloc(100,1);
  const plan=JSON.stringify({title:'Original fixture song',input_sha256:sha(input),direction,language:{code:'en',label:'English'},influences:[{reference:profile.references[0]}],cases:[{vocal_language:'en',voice:'female',bpm:110,lyrics:'Original fixture lyrics'}]});
  const receipt={plan_sha256:sha(plan),audio_sha256:sha(audio)};
  for(const [name,data] of Object.entries({'input.json':input,'plan.json':plan,'status.json':JSON.stringify({state:'completed'}),'fit.json':JSON.stringify({...receipt,input_sha256:sha(input),target:direction!.id,accepted:true}),'singer/complete.json':JSON.stringify(receipt),'singer/singer.wav':audio}))await writeFile(join(work,name),data);
 }
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(const owner of ['alice','bob','empty'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
  for(const owner of ['alice','bob'])await commerce.wallet.grant(owner,{provider:'stripe_test',receipt:owner,credits:20,netMicros:10_000_000});
  const context={commerce,owner:'alice'},other={commerce,owner:'bob'},anonymous={commerce,owner:null};
  await t.test('whole playlist account profiles persist all Unicode favorites privately',async()=>{
   const {TasteStore}=await import('../lib/taste-store');const {emptyTaste}=await import('../lib/taste');
   const store=new TasteStore(pool),references=Array.from({length:5000},(_,i)=>`Günden Güne ${i} — Sanatçı`);
   const value={...emptyTaste,references,referenceMetadata:references.map(reference=>({reference,genre:'Rock',source:'itunes'}))};
   const revision=await store.save('alice',value,0);const saved=await store.load('alice');assert.equal(saved.profile.references.length,5000);assert.equal(saved.profile.references[4999],references[4999]);assert.equal(await store.load('bob'),null);await store.remove('alice',revision);
  });
  await t.test('song descriptions survive restart and stay bound to owner, billing environment and favorites',async()=>{
   await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['sound','sound@example.test']);
   await commerce.wallet.grant('sound',{provider:'stripe_test',receipt:'sound',credits:10,netMicros:1000000});
   const job=id(),quote=await commerce.quote('sound',profile,'private');await commerce.submit('sound',job,profile,'private',quote.token);
   const track={reference:profile.references[0],catalogue_genre:'Pop',version:1,model_revision:'fixture',confidence:'medium'};
   await commerce.finish(job,'completed',{title:'Sound fixture',language:'en',direction:'Pop',plan:{track_profiles:[track]}});
   const restarted=new DnaCommerce(pool,'local-dna-test-secret-'.repeat(3));
   assert.deepEqual(await restarted.trackProfiles('sound',profile),[track]);
   assert.deepEqual(await restarted.trackProfiles('bob',profile),[]);
   assert.deepEqual(await restarted.trackProfiles('sound',{references:['Another song']}),[]);
   assert.deepEqual(await new DnaCommerce(pool,'secret',undefined,{live:true}).trackProfiles('sound',profile),[]);
   assert.deepEqual(await new DnaCommerce(pool,'secret',undefined,{product:'improvise'}).trackProfiles('sound',profile),[]);
   await pool.query('UPDATE dna_song_jobs SET song_plan=$2 WHERE id=$1',[job,JSON.stringify({track_profiles:[{...track,oversize:'x'.repeat(5000)}]})]);
   assert.deepEqual(await restarted.trackProfiles('sound',profile),[]);
   await pool.query('UPDATE dna_song_jobs SET song_plan=$2 WHERE id=$1',[job,JSON.stringify({track_profiles:[{...track,unavailable:true}]})]);
   assert.deepEqual(await restarted.trackProfiles('sound',profile),[]);
   await pool.query('UPDATE dna_song_jobs SET song_plan=$2 WHERE id=$1',[job,JSON.stringify({track_profiles:{bad:true}})]);
   assert.deepEqual(await restarted.trackProfiles('sound',profile),[]);
  });
  await t.test('price, atomic reservation and duplicate request binding',async()=>{
   const pub=await commerce.quote('alice',profile,'public'),priv=await commerce.quote('alice',profile,'private');
   assert.equal(pub.credits,1);assert.equal(priv.credits,2);
   await assert.rejects(commerce.quote('empty',profile,'public'),/Insufficient/);
   const job=id();
   const results=await Promise.all(Array.from({length:5},()=>commerce.submit('alice',job,profile,'private',priv.token)));
   assert.equal(new Set(results.map(r=>r.reservation_id)).size,1);assert.deepEqual(await commerce.wallet.balance('alice'),{available:18,reserved:2});
   await assert.rejects(commerce.submit('bob',job,profile,'private',priv.token));
   await assert.rejects(commerce.submit('alice',job,{...profile,references:['changed']},'private',priv.token));
   await assert.rejects(commerce.submit('alice',job,profile,'public',priv.token));
   await assert.rejects(commerce.submit('alice',id(),profile,'public',pub.token),/One active job/);
   await commerce.finish(job,'cancelled');await commerce.finish(job,'cancelled');
   assert.deepEqual(await commerce.wallet.balance('alice'),{available:20,reserved:0});
   const before=await commerce.wallet.balance('bob');
   await assert.rejects(commerce.wallet.reserve('bob','rollback_dna_test',50000,5000,undefined,'public',1,{fingerprint:'test',save:async()=>{throw Error('record insertion failed');}}),/insertion failed/);
   assert.deepEqual(await commerce.wallet.balance('bob'),before);
  });
  await t.test('private audio and notes are owner-only, with full premium charged once',async()=>{
   const job=id(),quote=await commerce.quote('alice',profile,'private');await commerce.submit('alice',job,profile,'private',quote.token);await commerce.start(job);await output(job);
   // The owner read recovers a finished worker after a server restart and settles exactly once.
   assert.equal((await dnaSong(request('?id='+job),context)).status,200);
   assert.equal((await dnaSong(request('?id='+job+'&file=audio'),context)).status,200);
   assert.equal((await dnaSong(request('?id='+job+'&file=plan'),context)).status,200);
   for(const visitor of [other,anonymous,undefined])for(const suffix of ['', '&file=audio','&file=plan','&file=audio&download=1'])
    assert.equal((await dnaSong(request('?id='+job+suffix),visitor)).status,404);
   assert.equal((await commerce.list(null,'public')).songs.length,0);
   assert.equal((await commerce.list('alice','mine')).songs.length,1);assert.equal((await commerce.list('bob','mine')).songs.length,0);
   assert.deepEqual(await commerce.wallet.balance('alice'),{available:18,reserved:0});
   await dnaSong(request('?id='+job),context);assert.deepEqual(await commerce.wallet.balance('alice'),{available:18,reserved:0});
  });
  await t.test('public success enters the feed, without favorites or identities; withdrawal removes access',async()=>{
   const job=id(),quote=await commerce.quote('alice',profile,'public');await commerce.submit('alice',job,profile,'public',quote.token);await commerce.start(job);await output(job);
   assert.equal((await commerce.list(null,'public')).songs.length,0);
   await dnaSong(request('?id='+job),context);
   const feed=await dnaSong(request('?view=public'),anonymous),body=await feed.text();assert.equal(feed.status,200);assert.ok(body.includes(job));assert.ok(!body.includes('alice')&&!body.includes('Private favorite'));
   const detail=await(await dnaSong(request('?id='+job),anonymous)).text();assert.ok(!detail.includes('Private favorite')&&!detail.includes('Private artist'));
   const rating=new Request('http://127.0.0.1:4247/api/taste/feedback?id='+job,{method:'POST',headers:{'X-Jamloom-DNA':'1','X-Jamloom-Listener':'a'.repeat(32),'Content-Type':'application/json'},body:JSON.stringify({rating:'like',tags:[],personalize:false,trainingConsent:true})});
   assert.equal((await dnaFeedback(rating,other)).status,403);
   assert.equal((await dnaSong(request('?id='+job+'&file=plan'),anonymous)).status,404);
   assert.equal((await dnaSong(request('?id='+job+'&file=audio'),anonymous)).status,200);
   assert.deepEqual(await commerce.wallet.balance('alice'),{available:17,reserved:0});
   assert.equal((await dnaSong(request('?id='+job,'DELETE'),other)).status,404);
   assert.equal((await dnaSong(request('?id='+job,'DELETE'),context)).status,200);
   assert.equal((await commerce.list(null,'public')).songs.length,0);
   assert.equal((await dnaSong(request('?id='+job+'&file=audio'),anonymous)).status,404);
   assert.equal((await dnaSong(request('?id='+job+'&file=audio'),context)).status,200);
  });
  await t.test('failure refunds all held credits and never publishes; anonymous generation is denied',async()=>{
   const job=id(),quote=await commerce.quote('alice',profile,'public');await commerce.submit('alice',job,profile,'public',quote.token);await commerce.start(job);
   const before=await commerce.wallet.balance('alice');await commerce.finish(job,'failed');await commerce.finish(job,'failed');
   assert.deepEqual(await commerce.wallet.balance('alice'),{available:before.available+1,reserved:0});
   assert.equal((await commerce.list(null,'public')).songs.length,0);
   assert.equal((await dnaSong(request('','POST',{}),anonymous)).status,401);
   assert.equal((await dnaSong(request('','POST',{}))).status,503);
  });
  await t.test('interrupted startup and missing worker files recover without stranded credits',async()=>{
   for(const state of ['queued','running']){
    const before=await commerce.wallet.balance('alice'),job=id(),quote=await commerce.quote('alice',profile,'private');
    await commerce.submit('alice',job,profile,'private',quote.token);
    if(state==='running')await commerce.start(job);
    await pool.query("UPDATE dna_song_jobs SET created_at=now()-interval '30 minutes',started_at=CASE WHEN state='running' THEN now()-interval '30 minutes' ELSE NULL END WHERE id=$1",[job]);
    const response=await dnaSong(request('?view=mine'),context);assert.equal(response.status,200);
    assert.equal((await commerce.row(job)).state,'failed');assert.deepEqual(await commerce.wallet.balance('alice'),before);
   }
  });
  await t.test('cloud storage failure holds completion; durable private/public songs survive without renderer files',async()=>{
   const disk=localAudioStore(join(root,'objects'));let fail=true;
   const cloud=new DnaCommerce(pool,'local-dna-test-secret-'.repeat(3),{...disk,local:false,
    put:async(key,data)=>{if(fail)throw Error('Storage offline');await disk.put(key,data);},
    playbackURL:async key=>'https://storage.example.test/'+key});
   const audio=Buffer.alloc(100,1);audio.write('RIFF');
   const plan={title:'Stored song',influences:[{reference:profile.references[0]}],cases:[{lyrics:'Original lyrics',voice:'female',bpm:110}]};
   const details={title:plan.title,language:'en',direction:'Pop',audio,plan};
   const remote=(job:string,suffix='',method='GET',origin='https://www.jamloom.com')=>new Request('https://www.jamloom.com/api/taste/song?id='+job+suffix,{method,headers:{origin,'X-Jamloom-DNA':'1'}});
   for(const visibility of ['private','public'] as const){
    const job=id(),quote=await cloud.quote('bob',profile,visibility);await cloud.submit('bob',job,profile,visibility,quote.token);await cloud.start(job);
    const held=await cloud.wallet.balance('bob');
    if(fail){await assert.rejects(cloud.finish(job,'completed',details),/Storage offline/);assert.equal((await cloud.row(job)).state,'running');assert.deepEqual(await cloud.wallet.balance('bob'),held);fail=false;}
    await cloud.finish(job,'completed',details);await cloud.finish(job,'completed',details);
    const row=await cloud.row(job);assert.ok(row.audio_key.startsWith('music-dna/'+visibility+'/'));assert.equal(row.audio_sha256,sha(audio));
    assert.deepEqual(await disk.get(row.audio_key,audio.length),audio);
    const owner={commerce:cloud,owner:'bob',readOnly:true},anonymous={commerce:cloud,owner:null,readOnly:true};
    assert.equal((await storedDnaSong(remote(job,'&file=audio'),owner))?.status,307);
    assert.equal((await storedDnaSong(remote(job,'&file=plan'),owner))?.status,200);
    for(const suffix of ['','&file=audio','&file=audio&download=1'])assert.equal((await storedDnaSong(remote(job,suffix),anonymous))?.status,visibility==='private'?404:suffix?307:200);
    assert.equal((await storedDnaSong(remote(job,'&file=plan'),anonymous))?.status,404);
    if(visibility==='public'){
     const detail=await (await storedDnaSong(remote(job),anonymous))!.text();assert.ok(!detail.includes('Private favorite'));
     assert.equal((await storedDnaSong(remote(job,'','DELETE','https://evil.test'),owner))?.status,403);
     assert.equal((await storedDnaSong(remote(job,'','DELETE'),owner))?.status,200);
     assert.equal((await storedDnaSong(remote(job,'&file=audio'),anonymous))?.status,404);
     assert.equal((await storedDnaSong(remote(job,'&file=audio'),owner))?.status,307);
    }
    assert.deepEqual(await cloud.wallet.balance('bob'),{available:held.available,reserved:0});
   }
   const before=await cloud.wallet.balance('bob'),job=id(),quote=await cloud.quote('bob',profile,'private');
   await cloud.submit('bob',job,profile,'private',quote.token);await cloud.start(job);fail=true;
   await assert.rejects(cloud.finish(job,'completed',details),/Storage offline/);
   assert.equal((await dnaSong(request('?id='+job,'DELETE'),{commerce:cloud,owner:'bob'})).status,200);
   assert.deepEqual(await cloud.wallet.balance('bob'),before);
  });
  await t.test('gallery filters cover all pages without exposing private, withdrawn or other-product metadata',async()=>{
   await commerce.wallet.grant('bob',{provider:'stripe_test',receipt:'gallery-filters',credits:60,netMicros:30_000_000});
   const jobs:string[]=[];
   for(let i=0;i<32;i++){
    const job=id(),visibility=i===26?'private':'public',quote=await commerce.quote('bob',profile,visibility);
    await commerce.submit('bob',job,profile,visibility,quote.token);await commerce.start(job);
    await commerce.finish(job,'completed',{title:'Gallery '+i,language:i<2?'tr':i<26?'en':['fr','de','ar','ja','ko','it'][i-26],direction:i<2?'Jazz':i<26?'Rock':'Hidden genre'});
    await pool.query("UPDATE dna_song_jobs SET created_at='2020-01-01'::timestamptz+$2*interval '1 second' WHERE id=$1",[job,i]);jobs.push(job);
   }
   await commerce.withdraw('bob',jobs[27]);
   await assert.rejects(pool.query('UPDATE dna_song_jobs SET public_consent_at=NULL WHERE id=$1',[jobs[28]]));
   await pool.query("UPDATE dna_song_jobs SET visibility='private',public_consent_at=NULL WHERE id=$1",[jobs[28]]);
   await pool.query("UPDATE dna_song_jobs SET product='improvise' WHERE id=$1",[jobs[29]]);
   await pool.query('UPDATE dna_song_jobs SET billing_live=true WHERE id=$1',[jobs[30]]);
   await pool.query("UPDATE dna_song_jobs SET state='failed' WHERE id=$1",[jobs[31]]);
   const first=await commerce.list(null,'public');assert.equal(first.songs.length,24);assert.ok(first.next);
   assert.deepEqual(first.filters,{languages:['en','tr'],genres:['Jazz','Rock']});
   const second=await commerce.list(null,'public',first.next);assert.deepEqual(second.songs.map(s=>s.id),[jobs[1],jobs[0]]);assert.equal(second.next,null);
   for(const query of ['language=tr','genre=Jazz','language=tr&genre=Jazz']){
    for(const response of [await dnaSong(request('?view=public&'+query),anonymous),await storedDnaSong(request('?view=public&'+query),{...anonymous,readOnly:true})]){
     const result=await response!.json();assert.deepEqual(result.songs.map((s:{id:string})=>s.id),[jobs[1],jobs[0]]);assert.deepEqual(result.filters,first.filters);
    }
   }
   assert.deepEqual((await commerce.list(null,'public','',{language:'tr',genre:'Rock'})).songs,[]);
   assert.deepEqual((await commerce.list(null,'public','',{language:"en' OR true --",genre:''})).songs,[]);
   await assert.rejects(commerce.list(null,'public','',{language:'x'.repeat(51),genre:''}),/Invalid song filters/);
  });
 }finally{if(old===undefined)delete process.env.JAMLOOM_DNA_SINGER_ROOT;else process.env.JAMLOOM_DNA_SINGER_ROOT=old;await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(root,{recursive:true,force:true});}
});
