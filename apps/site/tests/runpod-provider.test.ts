import test from 'node:test';
import assert from 'node:assert/strict';
import {RunpodProvider,type RunpodJob} from '../lib/runpod-provider';
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
 await assert.rejects(failed.status('job-1'),/^Error: Runpod request failed$/);
 const terminal=new RunpodProvider('secret','endpoint',async()=>Response.json({id:'job-1',status:'FAILED',error:'private transcript',executionTime:148}));
 assert.deepEqual(await terminal.status('job-1'),{id:'job-1',status:'FAILED',executionTime:148});
});
