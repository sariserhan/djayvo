import test from 'node:test';
import assert from 'node:assert/strict';
import {RunpodProvider,RunpodMissingJob,type RunpodJob} from '../lib/runpod-provider';
const job:RunpodJob={id:'a'.repeat(32),product:'music-dna',payload:{},output_url:'https://fixture.invalid',timeout_seconds:900};
test('Runpod submission is bounded, asynchronous, and never retried after uncertain acceptance',async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 const request:typeof fetch=async(url,init)=>{calls.push({url:String(url),init});return Response.json({id:'job-1',status:'IN_QUEUE'});};
 const provider=new RunpodProvider('secret','endpoint-1',request);
 assert.equal((await provider.submit(job)).id,'job-1');
 const body=JSON.parse(String(calls[0].init?.body));
 assert.deepEqual(body.policy,{executionTimeout:900000,ttl:1800000});
 assert.equal(calls[0].init?.redirect,'error');
 let count=0;
 const failing=new RunpodProvider('secret','endpoint-1',async()=>{count++;throw Error('secret and private URL');});
 await assert.rejects(failing.submit(job),/unconfirmed.*Do not automatically resubmit/);
 assert.equal(count,1);
 await assert.rejects(provider.submit({...job,timeout_seconds:901}),/Invalid/);
 assert.equal(calls.length,1);
});
test('Runpod status validates identity, states, timing and receipts without exposing provider errors',async()=>{
 for(const result of [{id:'other',status:'COMPLETED',output:{}},{id:'job-1',status:'FAKE'},
   {id:'job-1',status:'COMPLETED'},{id:'job-1',status:'IN_PROGRESS',executionTime:-1}]){
  const provider=new RunpodProvider('secret','endpoint',async()=>Response.json(result));
  await assert.rejects(provider.status('job-1'));
 }
 const provider=new RunpodProvider('secret','endpoint',async()=>Response.json({id:'job-1',status:'COMPLETED',output:{audio_sha256:'a'.repeat(64)},executionTime:1000}));
 assert.equal((await provider.status('job-1')).executionTime,1000);
 await assert.rejects(provider.status('../health'),/Invalid provider job ID/);
 const failed=new RunpodProvider('secret','endpoint',async()=>Response.json({error:'private secret'},{status:500}));
 await assert.rejects(failed.status('job-1'),/^Error: Runpod request failed \(Provider HTTP 500\)$/);
 const terminal=new RunpodProvider('secret','endpoint',async()=>Response.json({id:'job-1',status:'FAILED',error:'private transcript',executionTime:148}));
 assert.deepEqual(await terminal.status('job-1'),{id:'job-1',status:'FAILED',executionTime:148});
 for(const failure of ['style-rejected:matched-2-of-4','checking-exit--9','checking-timeout','worker-timeout','fit-retry@modeling_clap.py:123']){
  const error=`private signed URL https://private.invalid\nJamloom generation failed at ${failure}; no completed song was accepted.\nprivate lyrics`;
  const receipt=await new RunpodProvider('secret','endpoint',async()=>Response.json({id:'job-1',status:'FAILED',error})).status('job-1');
  assert.equal(receipt.failure,failure);assert.doesNotMatch(JSON.stringify(receipt),/private|https/);
 }
 const unsafe=await new RunpodProvider('secret','endpoint',async()=>Response.json({id:'job-1',status:'FAILED',error:'Jamloom generation failed at private lyrics; no completed song was accepted.'})).status('job-1');
 assert.equal(unsafe.failure,undefined);
});

test('dispatch checks disabled capacity without requiring a warm worker or submitting work',async()=>{
 for(const max of [0,1]){
  const provider=new RunpodProvider('secret','endpoint',async(url,init)=>{
   assert.equal(String(url),'https://api.runpod.io/v2/serverless/endpoint');assert.equal(init?.method,undefined);
   return Response.json({id:'endpoint',workers:{min:0,max}});
  });
  assert.equal(await provider.dispatchEnabled(),max>0);
 }
 for(const value of [{id:'other',workers:{max:1}},{id:'endpoint',workers:{max:'1'}},{id:'endpoint',workers:{max:-1}}]){
  await assert.rejects(new RunpodProvider('secret','endpoint',async()=>Response.json(value)).dispatchEnabled());
 }
});

test('only status 404 is an expired-receipt candidate; a submit 404 remains unconfirmed',async()=>{
 const provider=new RunpodProvider('secret','endpoint',async()=>new Response('Not found',{status:404}));
 await assert.rejects(provider.status('job-1'),RunpodMissingJob);
 await assert.rejects(provider.submit(job),/unconfirmed/);
});

test('whole playlists and cached descriptions pass a bounded provider request',async()=>{
 let calls=0;
 const provider=new RunpodProvider('secret','endpoint',async()=>{calls++;return Response.json({id:'large-job',status:'IN_QUEUE'});});
 const payload={profile:{references:Array.from({length:5000},(_,i)=>`Long multilingual favorite ${i} — Musician`)}};
 assert.ok(Buffer.byteLength(JSON.stringify(payload))>131072);
 assert.equal((await provider.submit({...job,payload})).id,'large-job');
 await assert.rejects(provider.submit({...job,payload:{extra:'x'.repeat(10_000_000)}}),/Invalid Runpod job/);
 assert.equal(calls,1);
});
