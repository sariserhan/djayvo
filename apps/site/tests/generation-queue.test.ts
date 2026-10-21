import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';
import {GenerationQueue} from '../lib/generation-queue';import {verifyPermit} from '../lib/generation-budget';
test('durable local queue: one claim, lease loss, cancellation, crash recovery, funded immutable work',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_queue_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),wallet=new Wallet(pool),secret='q'.repeat(32),queue=new GenerationQueue(pool,secret);
 try{
  await migrate(pool);for(const owner of ['alice','bob','carol']){await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await wallet.grant(owner,{provider:'stripe_test',receipt:'fixture_'+owner,credits:50,netMicros:20_000_000});}
  const spec={inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),maxRuntimeMs:60000,hourlyMicros:750000,fixedCostMicros:10000};
  const a=await wallet.reserve('alice','queue_alice',100000,5000,spec),b=await wallet.reserve('bob','queue_bob',100000,5000,spec);
  await assert.rejects(wallet.reserve('alice','queue_alice',100000,5000,{...spec,planSha256:'c'.repeat(64)}),/Changed quote/);
  const claims=await Promise.all(Array.from({length:8},(_,i)=>queue.claim('worker_'+i)));assert.equal(claims.filter(Boolean).length,1);
  const claim=claims.find(Boolean)!;assert.equal(claim.id,a);assert.equal(verifyPermit(claim.permit,secret).inputSha256,spec.inputSha256);
  assert.equal(await queue.heartbeat(a,randomUUID()),false);assert.equal(await queue.heartbeat(a,claim.leaseToken),true);
  await assert.rejects(wallet.settle('alice',a,0,'cancelled'),/shutdown/);
  await assert.rejects(queue.cancel('carol',a),/Unknown/);
  // Persisted expiry is inspected by a fresh queue instance after an orchestrator restart.
  await pool.query("UPDATE generation_jobs SET lease_until=now()-interval '1 second' WHERE reservation_id=$1",[a]);
  const restarted=new GenerationQueue(pool,secret);assert.equal((await restarted.shutdownRequired()).length,1);
  assert.equal(await restarted.claim('replacement'),null);assert.equal(await restarted.heartbeat(a,claim.leaseToken),false);
  await assert.rejects(restarted.stopped(a,randomUUID(),100,'failed'),/lease/);
  await assert.rejects(restarted.stopped(a,claim.leaseToken,100001,'failed'),/ceiling/);
  await restarted.stopped(a,claim.leaseToken,100,'failed');await restarted.stopped(a,claim.leaseToken,100,'failed');
  assert.deepEqual(await wallet.balance('alice'),{available:49,reserved:0});
  const second=await queue.claim('second');assert.equal(second?.id,b);
  await queue.cancel('bob',b);assert.equal(await queue.heartbeat(b,second!.leaseToken),false);
  await assert.rejects(queue.stopped(b,second!.leaseToken,100,'completed','d'.repeat(64)),/Cancellation/);
  await queue.stopped(b,second!.leaseToken,100,'cancelled');assert.equal((await wallet.balance('bob')).reserved,0);
  const c=await wallet.reserve('carol','queue_carol',100000,5000,spec);await queue.cancel('carol',c);assert.deepEqual(await wallet.balance('carol'),{available:50,reserved:0});
  const d=await wallet.reserve('carol','queue_result',100000,5000,spec),third=await queue.claim('third');assert.equal(third?.id,d);
  await queue.stopped(d,third!.leaseToken,1000,'completed','e'.repeat(64));await queue.reconcile(d);
  assert.equal((await pool.query('SELECT output_sha256 FROM generation_jobs WHERE reservation_id=$1',[d])).rows[0].output_sha256,'e'.repeat(64));
  await assert.rejects(queue.stopped(d,third!.leaseToken,2000,'completed','e'.repeat(64)),/conflict/);
  assert.equal(await queue.claim('finished'),null);
  const e=await wallet.reserve('carol','queue_disputed',100000,5000,spec),fourth=await queue.claim('fourth');
  assert.equal(fourth?.id,e);await wallet.freezePurchase('stripe_test','fixture_carol');
  assert.equal(await queue.heartbeat(e,fourth!.leaseToken),false);assert.equal((await queue.shutdownRequired()).length,1);
  await queue.stopped(e,fourth!.leaseToken,100,'cancelled');
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
