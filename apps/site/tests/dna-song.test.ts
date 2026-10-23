import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {dnaSong,localSingerRoot,songInput} from '../lib/dna-song';
import {emptyTaste} from '../lib/taste';

const base='http://127.0.0.1:4247/api/taste/song';
const request=(method='GET',query='',body?:unknown)=>new Request(base+query,{method,headers:{host:'127.0.0.1:4247',origin:'http://127.0.0.1:4247','X-Jamloom-DNA':'1','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
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
test('local job enforces bounds, single execution, durable retrieval and cancellation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jamloom-dna-test-')),old=process.env.JAMLOOM_DNA_SINGER_ROOT;
 process.env.JAMLOOM_DNA_SINGER_ROOT=root;
 try{
  await mkdir(join(root,'.venv-singer/bin'),{recursive:true});await mkdir(join(root,'scripts'));
  await writeFile(join(root,'scripts/music_dna_song.py'),'fixture');
  // A tiny process fixture exercises the real process boundary without running the model in unit tests.
  await writeFile(join(root,'.venv-singer/bin/python'),`#!${process.execPath}\nconst fs=require('node:fs');const p=process.argv.at(-1);setTimeout(()=>{fs.mkdirSync(p+'/singer');fs.writeFileSync(p+'/singer/singer.wav',Buffer.alloc(100,1));fs.writeFileSync(p+'/plan.json',JSON.stringify({title:'Fixture song'}));fs.writeFileSync(p+'/status.json',JSON.stringify({state:'completed'}));},350);`,{mode:0o700});
  assert.equal((await dnaSong(request('POST','',{}))).status,400);
  assert.equal((await dnaSong(request('POST','',{large:'x'.repeat(65537)}))).status,413);
  const response=await dnaSong(request('POST','',{...emptyTaste,references:['My favorite']}));assert.equal(response.status,202);
  const {id}=await response.json();assert.match(id,/^[a-f0-9]{32}$/);
  assert.equal((await dnaSong(request('POST','',{...emptyTaste,references:['Other favorite']}))).status,409);
  assert.equal((await dnaSong(request('GET',`?id=${id}&file=audio`))).status,409);
  for(let i=0;i<100;i++){if((await(await dnaSong(request('GET',`?id=${id}`))).json()).state==='completed')break;await new Promise(r=>setTimeout(r,20));}
  const ready=await(await dnaSong(request('GET',`?id=${id}`))).json();assert.equal(ready.state,'completed');assert.equal(ready.plan.title,'Fixture song');
  const ranged=request('GET',`?id=${id}&file=audio`);ranged.headers.set('range','bytes=10-19');
  const audio=await dnaSong(ranged);assert.equal(audio.status,206);assert.equal((await audio.arrayBuffer()).byteLength,10);
  assert.equal((await dnaSong(request('GET','?id=../../secret'))).status,404);
  await new Promise(r=>setTimeout(r,100));
  const cancelled=await(await dnaSong(request('POST','',{...emptyTaste,references:['Stop me']}))).json();
  assert.ok(cancelled.id);assert.equal((await dnaSong(request('DELETE',`?id=${cancelled.id}`))).status,200);
  assert.equal((await(await dnaSong(request('GET',`?id=${cancelled.id}`))).json()).state,'cancelled');
  assert.equal((await readFile(join(root,'renders/music-dna-songs',id,'singer/singer.wav'))).length,100);
 }finally{if(old===undefined)delete process.env.JAMLOOM_DNA_SINGER_ROOT;else process.env.JAMLOOM_DNA_SINGER_ROOT=old;await rm(root,{recursive:true,force:true});}
});
