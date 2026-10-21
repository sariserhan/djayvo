import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import {signPermit,verifyPermit,runBudgeted,type WorkerPermit} from '../lib/generation-budget';
import {signQuote,verifyQuote} from '../lib/generation-quote';
const permit=():WorkerPermit=>({version:1,reservationId:'11111111-1111-4111-8111-111111111111',inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),expiresAt:Date.now()+60000,maxRuntimeMs:100,hourlyMicros:750000,fixedCostMicros:100000,costCapMicros:200000,attempt:1});
test('quotes bind accepted charge, account, source, plan, privacy and expiry',()=>{
 const now=Date.now(),secret='s'.repeat(32),q={version:1 as const,owner:'alice',expiresAt:now+300000,credits:2,costCapMicros:200000,marginBps:5000,visibility:'private' as const,job:permit()};
 const token=signQuote(q,secret,now);assert.deepEqual(verifyQuote(token,'alice',secret,now),q);
 assert.throws(()=>verifyQuote(token,'bob',secret,now),/identity/);
 assert.throws(()=>verifyQuote(token,'alice',secret,now+300000),/bounded/);
 assert.throws(()=>verifyQuote(token+'0','alice',secret,now),/quote/);
 assert.throws(()=>verifyQuote(token,'alice','wrong'.repeat(10),now),/quote/);
});
test('worker authorization binds hashes, deadlines, one attempt and conservative rental budget',()=>{
 const p=permit(),secret='x'.repeat(32),signed=signPermit(p,secret);assert.deepEqual(verifyPermit(signed,secret),p);
 assert.throws(()=>verifyPermit(signed,'y'.repeat(32)),/signature/);
 assert.throws(()=>verifyPermit(signed,secret,p.expiresAt),/bounded/);
 assert.throws(()=>signPermit({...p,maxRuntimeMs:900000,costCapMicros:100001},secret),/cap/);
 assert.throws(()=>signPermit({...p,attempt:2} as never,secret),/identity/);
 assert.throws(()=>signPermit({...p,hourlyMicros:NaN},secret),/bounded/);
});
test('real local subprocess is terminated on deadline, including an inference promise that ignores abort',async()=>{
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}),exited=once(child,'exit');let stops=0;
 await assert.rejects(runBudgeted(permit(),()=>new Promise(()=>{}),async()=>{stops++;child.kill('SIGKILL');await exited;}),/ceiling/);
 assert.equal(stops,1);assert.equal(child.signalCode,'SIGKILL');
});
test('completion and failures both terminate allocation; termination failure is not hidden',async()=>{
 let stops=0;assert.equal(await runBudgeted(permit(),async()=>42,async()=>{stops++;}),42);assert.equal(stops,1);
 await assert.rejects(runBudgeted(permit(),async()=>42,async()=>{throw new Error('Provider termination unconfirmed');}),/unconfirmed/);
});
