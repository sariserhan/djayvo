import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {Environment,Type} from '@apple/app-store-server-library';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';
import {reconcileAppleNotification} from '../lib/apple-payments';
test('decoded Apple refund fixture reconciles the real local ledger without replay or ordering grants',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_apple_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.href),wallet=new Wallet(pool),bundle='com.djayvo.app';
 try{
  await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['apple-fixture','apple@example.test']);
  const live=new Wallet(pool,true),purchase={provider:'apple_live' as const,receipt:'production-fixture',credits:10,netMicros:4_000_000};
  await assert.rejects(wallet.grant('apple-fixture',purchase),/Invalid receipt/);
  const lot=await live.grant('apple-fixture',purchase);assert.equal(await live.grant('apple-fixture',purchase),lot);
  assert.deepEqual(await wallet.balance('apple-fixture'),{available:0,reserved:0});
  assert.deepEqual(await live.balance('apple-fixture'),{available:10,reserved:0});
  const quote=await live.quote('apple-fixture',100_000);assert(quote.credits>0);
  const reservation=await live.reserve('apple-fixture','production_spend',100_000);
  assert((await live.balance('apple-fixture')).reserved>0);
  assert.deepEqual(await wallet.balance('apple-fixture'),{available:0,reserved:0});
  await live.settle('apple-fixture',reservation,0,'failed');
  await assert.rejects(wallet.freezePurchase('apple_live',purchase.receipt),/Invalid receipt/);
  await live.freezePurchase('apple_live',purchase.receipt);
  assert.deepEqual(await live.balance('apple-fixture'),{available:0,reserved:0});
  await pool.query('UPDATE credit_wallets SET frozen=false WHERE owner_id=$1',['apple-fixture']);
  let receipt='paid-fixture';
  const verifier={verifyAndDecodeNotification:async()=>({version:'2.0',notificationUUID:randomUUID(),notificationType:'REFUND',data:{environment:Environment.SANDBOX,bundleId:bundle,signedTransactionInfo:'fixture-only'}}),
   verifyAndDecodeTransaction:async()=>({environment:Environment.SANDBOX,bundleId:bundle,type:Type.CONSUMABLE,productId:'com.jamloom.credits.starter',transactionId:receipt,revocationDate:1})};
  await wallet.grant('apple-fixture',{provider:'apple_sandbox',receipt,credits:10,netMicros:4_000_000});
  await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  assert.deepEqual(await wallet.balance('apple-fixture'),{available:0,reserved:0});
  assert.equal((await pool.query("SELECT count(*)::int n FROM wallet_ledger_entries WHERE kind='refund' AND lot_id IN (SELECT id FROM credit_lots WHERE provider='apple_sandbox')")).rows[0].n,1);
  await assert.rejects(wallet.reserve('apple-fixture','cannot_spend',1),/frozen/);
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['fresh-fixture','fresh@example.test']);
  receipt='refund-before-grant';await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  await assert.rejects(wallet.grant('fresh-fixture',{provider:'apple_sandbox',receipt,credits:10,netMicros:4_000_000}),/held/);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
