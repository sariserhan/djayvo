import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {dnaSong as rawDnaSong,localSingerRoot,songInput} from '../lib/dna-song';
import {musicDirection,favoriteKey} from '../lib/taste-direction';
import {emptyTaste} from '../lib/taste';
import {listenerDirectory,saveFeedback} from '../lib/dna-feedback';
import {songCountry} from '../lib/dna-location';
import {randomUUID} from 'node:crypto';
import type {DnaCommerce} from '../lib/dna-commerce';
const records=new Map<string,any>();
// Process/HTTP fixture only; real wallet transactions are tested in dna-commerce.test.ts.
const commerce={wallet:{balance:async()=>({available:10,reserved:0})},
 pending:async()=>[],
 trackProfiles:async()=>[{reference:"Heavy favorite",catalogue_genre:"Metal",version:1,model_revision:"fixture"}],
 row:async(id:string)=>records.get(id),
 submit:async(owner:string,id:string,profile:unknown,visibility:string)=>{if(!records.has(id))records.set(id,{id,owner_id:owner,state:'queued',visibility,profile});return records.get(id);},
 start:async(id:string)=>{records.get(id).state='running';return true;},
 finish:async(id:string,state:string)=>{records.get(id).state=state;},
 withdraw:async(owner:string,id:string)=>{records.get(id).withdrawn_at='now';},
 } as unknown as DnaCommerce;
const dnaSong=(request:Request)=>rawDnaSong(request,{commerce,owner:'alice'});

const profile={...emptyTaste,references:['Heavy favorite'],referenceMetadata:[{reference:'Heavy favorite',genre:'Metal',source:'itunes' as const,id:1}]};
const base='http://127.0.0.1:4247/api/taste/song';
const request=(method='GET',query='',body?:unknown)=>new Request(base+query,{method,headers:{host:'127.0.0.1:4247',origin:'http://127.0.0.1:4247','X-Jamloom-DNA':'1','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify((body as any)?.references?{action:'submit',profile:body,visibility:'private',publicConsent:false,token:'fixture',requestId:randomUUID().replaceAll('-','')}:body)});
test('singer is opt-in and loopback only; profile transport excludes irrelevant controls',()=>{
 assert.throws(()=>localSingerRoot(request(),''),/not available/);
 for(const headers of [{host:'public.example'},{host:'127.0.0.1:4247',origin:'https://evil.test'},{host:'localhost','sec-fetch-site':'cross-site'},{host:'localhost','x-forwarded-for':'1.2.3.4'}] as Record<string,string>[]){
  assert.throws(()=>localSingerRoot(new Request(base,{headers}),'/local'),/denied/);
 }
 assert.throws(()=>localSingerRoot(new Request(base,{method:'POST'}),'/local'),/denied/);
 assert.equal(localSingerRoot(request(),'/local'),'/local');
 assert.throws(()=>songInput(emptyTaste),/at least one/);
 assert.deepEqual(songInput({...emptyTaste,references:['Halo — Beyoncé']}),{references:['Halo — Beyoncé'],referenceMetadata:[]});
});
test('queued song is readable before files exist, private to its owner and cancellable',async()=>{
 const old=process.env.JAMLOOM_DNA_SINGER_ROOT,oldVercel=process.env.VERCEL;
 const root=await mkdtemp(join(tmpdir(),'jamloom-queued-test-')),id=randomUUID().replaceAll('-','');
 process.env.JAMLOOM_DNA_SINGER_ROOT=root;delete process.env.VERCEL;
 records.set(id,{id,owner_id:'alice',state:'queued',visibility:'public',created_at:new Date().toISOString()});
 try{
  const queued=await dnaSong(request('GET',`?id=${id}`));assert.equal(queued.status,200);assert.equal((await queued.json()).state,'queued');
  assert.equal((await rawDnaSong(request('GET',`?id=${id}`),{commerce,owner:'bob'})).status,404);
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  assert.equal((await(await dnaSong(request('DELETE',`?id=${id}`))).json()).state,'cancelled');
 }finally{
  records.delete(id);if(old===undefined)delete process.env.JAMLOOM_DNA_SINGER_ROOT;else process.env.JAMLOOM_DNA_SINGER_ROOT=old;
  if(oldVercel!==undefined)process.env.VERCEL=oldVercel;await rm(root,{recursive:true,force:true});
 }
});
test('local job enforces bounds, single execution, durable retrieval and cancellation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jamloom-dna-test-')),old=process.env.JAMLOOM_DNA_SINGER_ROOT,oldFetch=globalThis.fetch,oldVercel=process.env.VERCEL;
 delete process.env.VERCEL;
 globalThis.fetch=async()=>Response.json({country:'TR',ip:'198.51.100.1'});
 process.env.JAMLOOM_DNA_SINGER_ROOT=root;
 try{
  await mkdir(join(root,'.venv-singer/bin'),{recursive:true});await mkdir(join(root,'scripts'));
  await writeFile(join(root,'scripts/music_dna_song.py'),'fixture');
  await mkdir(join(root,'build-style-training/taste-auditor'),{recursive:true});await writeFile(join(root,'build-style-training/taste-auditor/pytorch_model.bin'),'fixture');
  // A tiny process fixture exercises the real process boundary without running the model in unit tests.
  await writeFile(join(root,'.venv-singer/bin/python'),`#!${process.execPath}
const fs=require('node:fs'),crypto=require('node:crypto');const p=process.argv[4],sha=v=>crypto.createHash('sha256').update(v).digest('hex');
setTimeout(()=>{const input=fs.readFileSync(p+'/input.json'),audio=Buffer.alloc(100,1),plan=JSON.stringify({title:'Fixture song',direction:JSON.parse(input).direction,input_sha256:sha(input),cases:[{vocal_language:'en',bpm:140}]});
fs.mkdirSync(p+'/singer');fs.writeFileSync(p+'/singer/singer.wav',audio);fs.writeFileSync(p+'/plan.json',plan);
const receipt={plan_sha256:sha(plan),audio_sha256:sha(audio)};fs.writeFileSync(p+'/singer/complete.json',JSON.stringify(receipt));fs.writeFileSync(p+'/fit.json',JSON.stringify({...receipt,input_sha256:sha(input),accepted:true,target:JSON.parse(input).direction.id}));
fs.writeFileSync(p+'/status.json',JSON.stringify({state:'completed'}));},350);`,{mode:0o700});
  assert.equal((await dnaSong(request('POST','',{}))).status,400);
  assert.equal((await dnaSong(request('POST','',{large:'x'.repeat(4*1024*1024+1)}))).status,413);
  assert.equal((await dnaSong(request('POST','',{...emptyTaste,references:['Unknown']}))).status,422);
  const response=await dnaSong(request('POST','',profile));assert.equal(response.status,202);
  const {id}=await response.json();assert.match(id,/^[a-f0-9]{32}$/);
  assert.equal((await dnaSong(request('POST','',profile))).status,409);
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  for(let i=0;i<100;i++){if((await(await dnaSong(request('GET',`?id=${id}`))).json()).state==='completed')break;await new Promise(r=>setTimeout(r,20));}
  const ready=await(await dnaSong(request('GET',`?id=${id}`))).json();assert.equal(ready.state,'completed');assert.equal(ready.plan.title,'Fixture song');assert.equal(ready.styleChecked,true);assert.deepEqual(ready.profile.references,profile.references);assert.equal(ready.direction.id,'heavy-rock');
  const ranged=request('GET',`?id=${id}&file=audio`);ranged.headers.set('range','bytes=10-19');
  const audio=await dnaSong(ranged);assert.equal(audio.status,206);assert.equal((await audio.arrayBuffer()).byteLength,10);
  assert.equal((await dnaSong(request('GET','?id=../../secret'))).status,404);
  await new Promise(r=>setTimeout(r,100));
  const nextRequest=request('POST','',profile);nextRequest.headers.set('X-Jamloom-Listener','1'.repeat(32));
  await saveFeedback(listenerDirectory(root,nextRequest),id,{rating:'dislike',tags:['repetitive'],personalize:true,trainingConsent:false},ready,root);
  const cancelled=await(await dnaSong(nextRequest)).json();
  const nextInput=JSON.parse(await readFile(join(root,'renders/music-dna-songs',cancelled.id,'input.json'),'utf8'));
  assert.equal(nextInput.track_profiles[0].reference,'Heavy favorite');
  assert.deepEqual(nextInput.feedback.map((f:{tags:string[]})=>f.tags),[['repetitive']]);
  assert.equal(nextInput.country,'TR');assert.ok(!JSON.stringify(nextInput).includes('198.51.100.1'));
  assert.ok(cancelled.id);assert.equal((await dnaSong(request('DELETE',`?id=${cancelled.id}`))).status,200);
  assert.equal((await(await dnaSong(request('GET',`?id=${cancelled.id}`))).json()).state,'cancelled');
  const work=join(root,'renders/music-dna-songs',id);
  assert.equal((await readFile(join(work,'singer/singer.wav'))).length,100);
  const input=await readFile(join(work,'input.json'),'utf8');await writeFile(join(work,'input.json'),input.replace('Heavy favorite','Different list'));
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  await writeFile(join(work,'input.json'),input);
  const fit=JSON.parse(await readFile(join(work,'fit.json'),'utf8'));await writeFile(join(work,'fit.json'),JSON.stringify({...fit,accepted:false}));
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  await writeFile(join(work,'fit.json'),JSON.stringify({...fit,target:'pop'}));
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  await writeFile(join(work,'fit.json'),JSON.stringify(fit));await writeFile(join(work,'singer/singer.wav'),Buffer.alloc(100,2));
  assert.equal((await(await dnaSong(request('GET',`?id=${id}`))).json()).state,'rejected');
  await writeFile(join(work,'input.json'),JSON.stringify({profile}));await writeFile(join(work,'plan.json'),JSON.stringify({title:'Historical song'}));
  const legacy=await(await dnaSong(request('GET',`?id=${id}`))).json();assert.equal(legacy.legacy,true);assert.equal(legacy.styleChecked,false);assert.deepEqual(legacy.profile,profile);
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,200);
 }finally{globalThis.fetch=oldFetch;if(oldVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=oldVercel;if(old===undefined)delete process.env.JAMLOOM_DNA_SINGER_ROOT;else process.env.JAMLOOM_DNA_SINGER_ROOT=old;await rm(root,{recursive:true,force:true});}
});

test('country hint uses trusted hosting headers or loopback egress, never a remote server location',async()=>{
 const unused:typeof fetch=async()=>{throw Error('Should not look up remote server IP');};
 for(const [code,expected] of [['TR','TR'],['RU','RU'],['XX',null],['Turkey',null]]){
  const remote=new Request('https://jamloom.com/api/taste/song',{headers:{'x-vercel-ip-country':code!}});
  assert.equal(await songCountry(remote,unused,true),expected);
  assert.equal(await songCountry(remote,unused,false),null);
 }
 let calls=0;
 const lookup:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.country.is/');assert.equal(options?.redirect,'error');return Response.json({country:'TR',ip:'198.51.100.1'});};
 const local=request();local.headers.set('x-vercel-ip-country','RU');
 assert.equal(await songCountry(local,lookup,false),'TR');assert.equal(calls,1);
 local.headers.set('x-forwarded-for','198.51.100.1');assert.equal(await songCountry(local,lookup,false),null);assert.equal(calls,1);
 for(const response of [new Response('',{status:429}),Response.json({country:'invalid'}),Response.json(null)]){
  assert.equal(await songCountry(request(),async()=>response,false),null);
 }
 assert.equal(await songCountry(request(),async()=>{throw Error('Timed out');},false),null);
});

test('favorite identity includes genres, ignores order and case; direction follows all favorites',()=>{
 const snapshot={references:['A','B','C'],referenceMetadata:[{reference:'A',genre:'Alternative'},{reference:'B',genre:'Hard Rock'},{reference:'C',genre:'Metal'}].map(m=>({...m,source:'itunes' as const,id:1}))};
 assert.equal(musicDirection(snapshot)?.id,'heavy-rock');
 assert.equal(favoriteKey(snapshot),favoriteKey({...snapshot,references:['c','a','b']}));
 assert.notEqual(favoriteKey(snapshot),favoriteKey({...snapshot,referenceMetadata:[]}));
 assert.equal(musicDirection({references:['Unknown'],referenceMetadata:[]}),null);
 for(const [genre,target] of [['Dubstep','dance'],['Reggaeton','reggaeton'],['Rhythm and Blues','soul'],['Hardcore Dance','dance'],['Hard Rock','heavy-rock'],['Dub','reggae']])assert.equal(musicDirection({references:['x'],referenceMetadata:[{reference:'x',genre,source:'itunes',id:1}]})?.id,target);
});


test('maximum favorite identity and direction normalize each entry a bounded number of times',t=>{
 const references=Array.from({length:5000},(_,i)=>`Song ${i} — Artist`),snapshot={references,referenceMetadata:references.map((reference,i)=>({reference,genre:i<2000?'Pop':'Metal',source:'itunes' as const}))};
 const original=String.prototype.normalize;let normalizations=0;
 t.mock.method(String.prototype,'normalize',function(this:string,form?:string){normalizations++;return original.call(this,form);});
 assert.equal(musicDirection(snapshot)?.id,'heavy-rock');assert.equal(musicDirection(snapshot)?.coverage,5000);
 const identity=favoriteKey(snapshot);assert.equal(JSON.parse(identity)[1].length,5000);assert.ok(normalizations<=5000*10);
 const duplicate={references:['A','a'],referenceMetadata:[{reference:'A',genre:'Jazz',source:'itunes' as const},{reference:'a',genre:'Metal',source:'itunes' as const}]};
 assert.equal(musicDirection(duplicate)?.id,'jazz');assert.equal(JSON.parse(favoriteKey(duplicate))[1][0].genre,'jazz');
});
