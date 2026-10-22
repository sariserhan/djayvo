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
  let receipt='paid-fixture';
  const verifier={verifyAndDecodeNotification:async()=>({version:'2.0',notificationUUID:randomUUID(),notificationType:'REFUND',data:{environment:Environment.SANDBOX,bundleId:bundle,signedTransactionInfo:'fixture-only'}}),
   verifyAndDecodeTransaction:async()=>({environment:Environment.SANDBOX,bundleId:bundle,type:Type.CONSUMABLE,productId:'com.jamloom.credits.starter',transactionId:receipt,revocationDate:1})};
  await wallet.grant('apple-fixture',{provider:'apple_sandbox',receipt,credits:10,netMicros:4_000_000});
  await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  assert.deepEqual(await wallet.balance('apple-fixture'),{available:0,reserved:0});
  assert.equal((await pool.query("SELECT count(*)::int n FROM wallet_ledger_entries WHERE kind='refund'")).rows[0].n,1);
  await assert.rejects(wallet.reserve('apple-fixture','cannot_spend',1),/frozen/);
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['fresh-fixture','fresh@example.test']);
  receipt='refund-before-grant';await reconcileAppleNotification(verifier,wallet,'fixture-only',bundle);
  await assert.rejects(wallet.grant('fresh-fixture',{provider:'apple_sandbox',receipt,credits:10,netMicros:4_000_000}),/held/);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
