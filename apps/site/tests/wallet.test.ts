import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet} from '../lib/wallet';
import {TasteStore} from '../lib/taste-store';
import {emptyTaste} from '../lib/taste';
test('real Postgres ledger: conservation, concurrency, receipts, tenant isolation and costs',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');
 assert.equal(url.hostname,'127.0.0.1','Never run wallet tests on hosted data');
 const admin=createPool(url.toString()),name='jamloom_wallet_'+randomUUID().replaceAll('-','');
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),wallet=new Wallet(pool);
 try{
  assert.equal((await migrate(pool)).length,8);assert.deepEqual(await migrate(pool),[]);
  for(const id of ['alice','bob','carol'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,id+'@example.test']);
  await t.test('receipt replay grants exactly once and cannot move between accounts',async()=>{
   const p={provider:'stripe_test' as const,receipt:'cs_test_alice',credits:10,netMicros:4_000_000};
   const ids=await Promise.all(Array.from({length:8},()=>wallet.grant('alice',p)));assert.equal(new Set(ids).size,1);
   assert.deepEqual(await wallet.balance('alice'),{available:10,reserved:0});
   await assert.rejects(wallet.grant('bob',p),/Receipt conflict/);
   await assert.rejects(wallet.grant('alice',{...p,credits:20}),/Receipt conflict/);
  });
  await t.test('parallel reservations enforce one active job and no overspend',async()=>{
   const results=await Promise.allSettled(Array.from({length:8},(_,i)=>wallet.reserve('alice','parallel_'+i,600_000)));
   const passed=results.filter(r=>r.status==='fulfilled');assert.equal(passed.length,1);
   assert.deepEqual(await wallet.balance('alice'),{available:7,reserved:3});
   const id=(passed[0] as PromiseFulfilledResult<string>).value;
   await assert.rejects(wallet.settle('bob',id,0,'cancelled'),/Unknown/);
   await assert.rejects(wallet.settle('alice',id,600001,'completed'),/ceiling/);
   await wallet.settle('alice',id,200001,'completed');await wallet.settle('alice',id,200001,'completed');
   await assert.rejects(wallet.settle('alice',id,0,'cancelled'),/conflict/);
   assert.deepEqual(await wallet.balance('alice'),{available:8,reserved:0});
  });
  await t.test('zero-cost cancellation returns original lots; changed quote rejected',async()=>{
   const id=await wallet.reserve('alice','cancel_key',400_000);
   assert.equal(await wallet.reserve('alice','cancel_key',400_000),id);
   await assert.rejects(wallet.reserve('alice','cancel_key',400_001),/Changed quote/);
   await wallet.settle('alice',id,0,'cancelled');assert.deepEqual(await wallet.balance('alice'),{available:8,reserved:0});
  });
  await t.test('Apple sandbox lots preserve their own economics, ledgers immutable, disputes freeze',async()=>{
   await wallet.grant('carol',{provider:'apple_sandbox',receipt:'apple_1',credits:10,netMicros:3_000_000});
   await wallet.grant('carol',{provider:'stripe_test',receipt:'stripe_carol',credits:10,netMicros:5_000_000});
   const id=await wallet.reserve('carol','mixed_lots',1_600_000,5000);await wallet.settle('carol',id,1_600_000,'completed');
   const income=(await pool.query(`SELECT sum(-e.reserved_delta*a.net_per_credit) AS income FROM wallet_ledger_entries e
     JOIN credit_allocations a ON a.reservation_id=e.reservation_id AND a.lot_id=e.lot_id WHERE e.kind='capture' AND e.reservation_id=$1`,[id])).rows[0];
   assert.ok(Number(income.income)>=3_200_000);
   await assert.rejects(pool.query("UPDATE wallet_ledger_entries SET available_delta=100 WHERE owner_id='alice'"),/append-only/);
   await wallet.freezePurchase('stripe_test','cs_test_alice');await assert.rejects(wallet.reserve('alice','frozen_key',1),/frozen/);
  });
  await t.test('unfunded jobs and invalid cost caps rejected without mutation',async()=>{
   await assert.rejects(wallet.reserve('bob','empty_key',1),/Insufficient/);
   await assert.rejects(wallet.reserve('bob','cost_limit',5_000_001),/bounded/);
   assert.deepEqual(await wallet.balance('bob'),{available:0,reserved:0});
  });
  await t.test('out-of-order refund and grant races cannot leave spendable disputed credits',async()=>{
   await wallet.freezePurchase('stripe_test','refund_first');
   await assert.rejects(wallet.grant('bob',{provider:'stripe_test',receipt:'refund_first',credits:10,netMicros:4_000_000}),/held/);
   await Promise.allSettled([wallet.grant('bob',{provider:'stripe_test',receipt:'refund_race',credits:10,netMicros:4_000_000}),wallet.freezePurchase('stripe_test','refund_race')]);
   await assert.rejects(wallet.reserve('bob','refund_cannot_run',100),/frozen|Insufficient/);
   await assert.rejects(wallet.grant('bob',{provider:'stripe_test',receipt:'refund_race',credits:10,netMicros:4_000_000}),/frozen|held/);
  });
  await t.test('taste profiles are owner-scoped with optimistic concurrency and deletion',async()=>{
   const tastes=new TasteStore(pool);assert.equal(await tastes.load('alice'),null);
   assert.equal(await tastes.save('alice',emptyTaste,0),1);assert.equal(await tastes.load('bob'),null);
   const edits=await Promise.allSettled([tastes.save('alice',{...emptyTaste,tempo:120},1),tastes.save('alice',{...emptyTaste,tempo:90},1)]);
   assert.equal(edits.filter(r=>r.status==='fulfilled').length,1);assert.equal((await tastes.load('alice')).revision,2);
   await assert.rejects(tastes.remove('bob',2),/changed/);await assert.rejects(tastes.remove('alice',1),/changed/);
   await tastes.remove('alice',2);assert.equal(await tastes.load('alice'),null);
   assert.equal(await tastes.save('alice',emptyTaste,0),3);await assert.rejects(tastes.save('alice',emptyTaste,1),/changed/);
   assert.equal(await wallet.accountToken('carol'),await wallet.accountToken('carol'));
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
