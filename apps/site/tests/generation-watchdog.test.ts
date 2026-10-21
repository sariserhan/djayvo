import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';
import {GenerationQueue} from '../lib/generation-queue';import {GenerationWatchdog} from '../lib/generation-watchdog';
import type {RentalInstance,RentalProvider} from '../lib/vast-provider';

test('durable watchdog: lost create/delete responses, restart, cancellation, identity/cost holds and settlement recovery',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_watchdog_'+randomUUID().replaceAll('-','');
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.toString());
 const wallet=new Wallet(pool),queue=new GenerationQueue(pool,'q'.repeat(32));
 let instances:RentalInstance[]=[],deletes:number[]=[],failInventory=false,failDelete=false;
 const provider:RentalProvider={inventory:async account=>{assert.equal(account,42);if(failInventory)throw new Error('offline');return instances;},
  destroy:async id=>{deletes.push(id);if(failDelete)throw new Error('lost response');}};
 const watchdog=new GenerationWatchdog(pool,provider),spec={inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),maxRuntimeMs:60000,hourlyMicros:750000,fixedCostMicros:10000};
 const costHash='c'.repeat(64);
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(const owner of ['alice','bob','carol']){
   await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
   await wallet.grant(owner,{provider:'stripe_test',receipt:'fixture_'+owner,credits:50,netMicros:20_000_000});
  }
  const id=await wallet.reserve('alice','watch_alice',100000,5000,spec),claim=(await queue.claim('worker'))!;
  await assert.rejects(watchdog.prepare(id,randomUUID(),42),/lease/);
  const label=await watchdog.prepare(id,claim.leaseToken,42);assert.equal(await watchdog.prepare(id,claim.leaseToken,42),label);
  await assert.rejects(watchdog.prepare(id,claim.leaseToken,43),/identity/);
  await assert.rejects(queue.stopped(id,claim.leaseToken,0,'failed'),/Provider shutdown/);
  await pool.query("UPDATE generation_jobs SET lease_until=now()-interval '1 second' WHERE reservation_id=$1",[id]);
  assert.equal((await watchdog.sweep())[0].status,'shutdown_required');assert.deepEqual(deletes,[]);
  assert.equal((await watchdog.sweep(true))[0].status,'creation_unresolved');
  assert.equal(await queue.claim('second'),null);assert.equal((await wallet.balance('alice')).reserved,1);
  // Lost creation response is recovered by the durable unique label, with no second rental.
  instances=[{id:77,label},{id:88,label:'unrelated-rental'}];failInventory=true;
  assert.equal((await watchdog.sweep(true))[0].status,'held_for_reconciliation');assert.deepEqual(deletes,[]);
  failInventory=false;failDelete=true;assert.equal((await watchdog.sweep(true))[0].status,'held_for_reconciliation');
  assert.deepEqual(deletes,[77]);await assert.rejects(watchdog.recordCost(id,0,costHash),/shutdown/);
  await assert.rejects(queue.stopped(id,claim.leaseToken,100,'failed'),/Provider shutdown/);
  // A fresh controller reconciles a lost delete response via complete provider inventory.
  instances=[{id:88,label:'unrelated-rental'}];failDelete=false;
  const restarted=new GenerationWatchdog(pool,provider);
  assert.equal((await restarted.sweep(true))[0].status,'awaiting_cost_evidence');
  await restarted.recordCost(id,100,costHash);await restarted.recordCost(id,100,costHash);
  await assert.rejects(restarted.recordCost(id,200,costHash),/conflict/);
  assert.equal((await restarted.sweep(true))[0].status,'settled');assert.deepEqual(await wallet.balance('alice'),{available:49,reserved:0});
  assert.deepEqual(await restarted.sweep(true),[]);assert.deepEqual(deletes,[77]);
  // Label duplication or replacement must not destroy a different rental.
  const b=await wallet.reserve('bob','watch_bob',100000,5000,spec),second=(await queue.claim('worker2'))!;
  const labelB=await watchdog.prepare(b,second.leaseToken,42);await queue.cancel('bob',b);
  instances=[{id:81,label:labelB},{id:82,label:labelB}];
  assert.equal((await watchdog.sweep(true))[0].status,'rental_identity_conflict');assert.deepEqual(deletes,[77]);
  instances=[{id:81,label:labelB}];assert.equal((await watchdog.sweep(true))[0].status,'destroy_requested');
  assert.equal((await wallet.balance('bob')).reserved,1);
  instances=[{id:81,label:'different-job'}];assert.equal((await watchdog.sweep(true))[0].status,'rental_identity_conflict');
  instances=[];assert.equal((await watchdog.sweep(true))[0].status,'awaiting_cost_evidence');
  await watchdog.recordCost(b,100,costHash);assert.equal((await watchdog.sweep(true))[0].status,'settled');
  assert.equal((await pool.query('SELECT state FROM generation_jobs WHERE reservation_id=$1',[b])).rows[0].state,'cancelled');
  // Crash after terminal write but before wallet settlement recovers without duplicate capture.
  const c=await wallet.reserve('carol','watch_carol',100000,5000,spec),third=(await queue.claim('worker3'))!;
  await pool.query("UPDATE generation_jobs SET state='failed',actual_cost_micros=100,stop_confirmed_at=now() WHERE reservation_id=$1",[c]);
  assert.equal((await watchdog.sweep(true))[0].status,'settlement_recovered');await queue.reconcile(c);
  assert.deepEqual(await wallet.balance('carol'),{available:49,reserved:0});
  await assert.rejects(watchdog.prepare(c,third.leaseToken,42),/lease/);
  // Unbound local jobs are visible and held; unknown provider state never releases credits.
  const d=await wallet.reserve('carol','watch_unbound',100000,5000,spec),fourth=(await queue.claim('worker4'))!;await queue.cancel('carol',d);
  assert.deepEqual(await watchdog.sweep(true),[{id:d,status:'unbound_manual_reconciliation'}]);
  const lock=await pool.connect();
  try{await lock.query("SELECT pg_advisory_lock(hashtextextended('jamloom-rental-watchdog',0))");
   assert.deepEqual(await watchdog.sweep(true),[{id:'',status:'watchdog_busy'}]);
  }finally{await lock.query("SELECT pg_advisory_unlock(hashtextextended('jamloom-rental-watchdog',0))");lock.release();}
  await queue.stopped(d,fourth.leaseToken,0,'cancelled');
  // Even after termination, an invoice above the reserved cap cannot consume extra credits.
  const e=await wallet.reserve('alice','watch_overcap',100000,5000,spec),fifth=(await queue.claim('worker5'))!;
  const labelE=await watchdog.prepare(e,fifth.leaseToken,42);await queue.cancel('alice',e);
  instances=[{id:83,label:labelE}];assert.equal((await watchdog.sweep(true))[0].status,'destroy_requested');
  instances=[];assert.equal((await watchdog.sweep(true))[0].status,'awaiting_cost_evidence');
  await watchdog.recordCost(e,100001,costHash);assert.equal((await watchdog.sweep(true))[0].status,'held_for_reconciliation');
  assert.equal((await wallet.balance('alice')).reserved,1);assert.equal(await queue.claim('replacement'),null);
  assert.ok(deletes.every(value=>value===77||value===81||value===83));
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
