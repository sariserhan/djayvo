import test from 'node:test';
import assert from 'node:assert/strict';
import {dnaExample,exampleAudioKey} from '../lib/dna-examples';
import {r2AudioStore} from '../lib/audio-store';
import examples from '../../../assets/manifests/dna-examples.json';
import {dnaSong} from '../lib/dna-song';
import type {DnaCommerce} from '../lib/dna-commerce';
import {validationSongs} from '../lib/music-validation';
import {musicAudioKey} from '../lib/music-storage';

test('test songs expose only published audio and label unaccepted takes without enabling training',async()=>{
 const base='https://www.jamloom.com/api/taste/song',calls:unknown[][]=[];
 const store=()=>({playbackURL:async(...args:unknown[])=>{calls.push(args);return 'https://r2.example.test/test-audio';}});
 const response=await dnaExample(new Request(base+'?view=validation'),store),data=await response!.json();
 assert.deepEqual(data.songs,validationSongs);assert.equal(data.feedbackAvailable,false);assert.equal(calls.length,0);
 assert.ok(validationSongs.length>0);
 for(const song of validationSongs){
  assert.ok(['owner-reviewed','passed','style-mismatch','not-checked'].includes(song.check));
  assert.ok(!('audio' in song)&&!('favorites' in song));
  const audio=await dnaExample(new Request(base+`?id=${song.id}&file=audio`),store);assert.equal(audio?.status,307);
  assert.deepEqual(calls.at(-1),[musicAudioKey(song.product,'public',song.id,song.audioSha256),false,900]);
  for(const file of ['plan','input'])assert.equal(await dnaExample(new Request(base+`?id=${song.id}&file=${file}`),store),null);
  assert.equal(await dnaExample(new Request(base+`?id=${song.id}&file=audio`,{method:'DELETE'}),store),null);
 }
});

test('hosted account context cannot spend credits through the Mac renderer',async()=>{
 const commerce=new Proxy({},{get(){throw Error('Production commerce must not be touched');}}) as DnaCommerce;
 for(const method of ['GET','POST','DELETE']){
  const response=await dnaSong(new Request('http://127.0.0.1/api/taste/song',{method}),{commerce,owner:'owner',readOnly:true});
  assert.equal(response.status,503);assert.match((await response.json()).error,/not available/);
 }
});

test('hosted examples work without the Mac or account DB and only sign allowlisted audio',async()=>{
 const base='https://www.jamloom.com/api/taste/song',song=examples.examples[0],calls:unknown[][]=[];
 const store=()=>({playbackURL:async(...args:unknown[])=>{calls.push(args);return 'https://r2.example.test/signed-audio';}});
 const list=await dnaExample(new Request(base+'?view=examples'),store);
 assert.equal(list?.status,200);const data=await list!.json();assert.equal(data.songs.length,9);assert.equal(data.feedbackAvailable,false);
 assert.equal(calls.length,0);
 for(const download of [false,true]){
  const response=await dnaExample(new Request(base+`?id=${song.id}&file=audio${download?'&download=1':''}`,{headers:{Range:'bytes=0-43'}}),store);
  assert.equal(response?.status,307);assert.equal(response?.headers.get('location'),'https://r2.example.test/signed-audio');
  assert.match(response!.headers.get('cache-control')!,/no-store/);
  assert.deepEqual(calls.at(-1),[exampleAudioKey(song),download,900]);
 }
 for(const query of ['?view=mine','?view=public','?id='+('a'.repeat(32))+'&file=audio',`?id=${song.id}&file=plan`,`?id=${song.id}&file=input`])assert.equal(await dnaExample(new Request(base+query),store),null);
 for(const method of ['POST','DELETE'])assert.equal(await dnaExample(new Request(base+`?id=${song.id}&file=audio`,{method}),store),null);
 assert.equal(calls.length,2);
 const failure=await dnaExample(new Request(base+`?id=${song.id}&file=audio`),()=>{throw Error('secret credentials');});
 assert.equal(failure?.status,503);assert.ok(!(await failure!.text()).includes('secret'));
});

test('R2 sample grants preserve the default private-audio lifetime and allow longer listening',async()=>{
 const store=r2AudioStore({R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'example-audio',R2_ACCESS_KEY_ID:'fixture-access',R2_SECRET_ACCESS_KEY:'fixture-secret'});
 for(const [seconds,download] of [[undefined,false],[900,true]] as const){
  const url=new URL(await store.playbackURL('masters/dna-examples/test.wav',download,seconds));
  assert.equal(url.searchParams.get('X-Amz-Expires'),String(seconds??60));
  assert.match(url.searchParams.get('response-content-disposition')!,download?/attachment/:/inline/);
 }
});

test('the explicit jazz review is shown as a human verdict rather than an automated pass',()=>{
 const reviewed=validationSongs.filter(s=>s.check==='owner-reviewed');
 assert.equal(reviewed.length,1);assert.equal(reviewed[0].audioSha256,'c0dbbabab04353d94c16714767553bbd6579d018031be7ee3b298c5d4c610560');assert.equal(reviewed[0].direction,'jazz');
});
