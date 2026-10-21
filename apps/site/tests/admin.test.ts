import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import Stripe from 'stripe';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {AdminStore,ticketInput} from '../lib/admin-store';import {OWNER_EMAIL,isAdmin} from '../lib/admin-access';import {defaultSettings,siteSettings,settingsInput} from '../lib/site-settings';import {Wallet} from '../lib/wallet';import {enqueueEmail,deliverNotifications} from '../lib/notifications';import {readConfig} from '../lib/config';import {AcademyStore} from '../lib/academy-store';import {billingReadiness,academyStripe} from '../lib/billing-mode';import {verifiedAcademyPrice,grantAcademy,academyWebhook} from '../lib/academy-payments';
const liveEnv={STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',ACADEMY_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_live_fixture',ACADEMY_STRIPE_LIVE_PRICE_ID:'price_live',ACADEMY_STRIPE_LIVE_PRODUCT_ID:'prod_live'};
const message={kind:'support',name:'Listener <tag>',email:'listener@example.test',subject:'Audio question',body:'Please help <script>alert(1)</script>.'};
test('admin boundaries reject unverified identities, invalid settings and mixed Stripe environments',()=>{
 assert.equal(isAdmin({email:OWNER_EMAIL,emailVerified:false}),false);assert.equal(isAdmin({email:'other@example.test',emailVerified:true}),false);assert.equal(isAdmin({email:OWNER_EMAIL.toUpperCase(),emailVerified:true}),true);
 assert.throws(()=>settingsInput({...defaultSettings,billing_mode:['test']}));assert.throws(()=>settingsInput({...defaultSettings,extra:true}));assert.throws(()=>settingsInput({...defaultSettings,banner:'x'.repeat(501)}));assert.throws(()=>ticketInput({...message,email:'x\r\nbcc@example.com'}));assert.throws(()=>ticketInput({...message,subject:'Bad\nSubject'}));
 assert.equal(billingReadiness('live',liveEnv).configured,true);assert.equal(billingReadiness('live',liveEnv).academyCheckoutEnabled,false);assert.equal(billingReadiness('live',liveEnv).generationCheckoutEnabled,false);
 assert.equal(billingReadiness('live',{...liveEnv,STRIPE_LIVE_SECRET_KEY:'sk_test_wrong'}).configured,false);assert.throws(()=>academyStripe('test',liveEnv));
});
test('real Postgres administration, durable mail, credit exemption and billing isolation',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const root=createPool(url.toString()),name='jamloom_admin_'+randomUUID().replaceAll('-','');await root.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-admin-'));
 const config=readConfig({DATABASE_URL:url.toString(),BETTER_AUTH_URL:'http://127.0.0.1:4225',BETTER_AUTH_SECRET:'local-only-'.repeat(5),JAMLOOM_LOCAL_OUTBOX:folder}),store=new AdminStore(pool,config.baseURL),wallet=new Wallet(pool);
 try{assert.equal((await migrate(pool)).length,11);assert.deepEqual(await migrate(pool),[]);for(const [id,email,verified] of [['owner',OWNER_EMAIL,true],['alice','alice@example.test',true],['unverified','unverified@example.test',false]])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,$3)',[id,email,verified]);
 await t.test('settings require real owner, reject stale writes and absent live credentials, audit cannot be edited',async()=>{
  await assert.rejects(store.settings('alice',defaultSettings),/Administrator/);await assert.rejects(store.settings('owner',{...defaultSettings,billing_mode:'live'},{}),/separate live/);
  await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=\'owner\'');await assert.rejects(store.settings('owner',defaultSettings),/Administrator/);await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=\'owner\'');
  const saved=await store.settings('owner',{...defaultSettings,banner:'Maintenance <script> test'});assert.equal(saved.revision,1);await assert.rejects(store.settings('owner',defaultSettings),/another tab/);assert.equal((await siteSettings(pool)).banner,'Maintenance <script> test');
  await assert.rejects(pool.query("DELETE FROM admin_audit"),/append-only/);
 });
 await t.test('contact transaction persists notification, reply is private and stale replay cannot email twice',async()=>{
  const {id}=await store.contact({...message,kind:'contact'},'192.0.2.1');assert.equal((await pool.query('SELECT count(*)::int n FROM notification_outbox')).rows[0].n,1);
  await assert.rejects(store.ticket('alice',id,{body:'forged',status:'closed',revision:0}),/Administrator/);
  await store.ticket('owner',id,{body:'Try the headphones output.',status:'closed',revision:0});await assert.rejects(store.ticket('owner',id,{body:'duplicate',status:'closed',revision:0}),/changed/);
  assert.equal((await pool.query('SELECT count(*)::int n FROM support_replies')).rows[0].n,1);assert.equal((await pool.query('SELECT status FROM support_tickets WHERE id=$1',[id])).rows[0].status,'closed');
  for(let i=0;i<4;i++)await store.contact(message,'192.0.2.1');await assert.rejects(store.contact(message,'192.0.2.2'),/Too many/);
  assert.equal((await pool.query('SELECT count(*)::int n FROM support_tickets')).rows[0].n,5);
 });
 await t.test('email failures remain durable, retry leases avoid concurrent sends, template escapes submitted content',async()=>{
  await deliverNotifications(pool,config,async()=>{throw Error('private provider error');});assert.equal((await pool.query('SELECT count(*)::int n FROM notification_outbox WHERE sent_at IS NULL')).rows[0].n,6);
  await store.retry('owner');await Promise.all([deliverNotifications(pool,config),deliverNotifications(pool,config)]);const files=await readdir(folder);assert.equal(files.length,6);
  for(const file of files){const m=JSON.parse(await readFile(join(folder,file),'utf8'));assert.ok(m.html.includes('jamloom</a>'));assert.ok(m.html.includes('mailto:support@jamloom.com'));assert.ok(!m.html.includes('<script>'));assert.ok(m.text.includes('Jamloom'));}
  const key='idempotent-test';await enqueueEmail(pool,key,{to:OWNER_EMAIL,subject:'Fixture',text:'Fixture'});await enqueueEmail(pool,key,{to:OWNER_EMAIL,subject:'Fixture',text:'Fixture'});assert.equal((await pool.query('SELECT count(*)::int n FROM notification_outbox WHERE event_key=$1',[key])).rows[0].n,1);
 });
 await t.test('only verified owner can reserve without credits; caps, actual costs, replays and frozen wallets remain enforced',async()=>{
  await assert.rejects(wallet.reserve('alice','ordinary_without_credits',1),/Insufficient/);
  await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=\'owner\'');await assert.rejects(wallet.reserve('owner','unverified_owner',1),/Insufficient/);await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=\'owner\'');
  const id=await wallet.reserve('owner','owner_first_job',5_000_000);assert.equal(await wallet.reserve('owner','owner_first_job',5_000_000),id);await assert.rejects(wallet.reserve('owner','concurrent_job',1),/active job/);await assert.rejects(wallet.settle('owner',id,5_000_001,'completed'),/ceiling/);await wallet.settle('owner',id,5_000_000,'completed');
  const second=await wallet.reserve('owner','owner_second_job',5_000_000);await wallet.settle('owner',second,5_000_000,'completed');await assert.rejects(wallet.reserve('owner','over_daily_limit',1),/Daily cost/);
  assert.deepEqual(await wallet.balance('owner'),{available:0,reserved:0});assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots WHERE owner_id=\'owner\'')).rows[0].n,0);assert.equal((await pool.query('SELECT sum(actual_cost_micros)::int n FROM generation_reservations WHERE owner_id=\'owner\' AND credit_exempt')).rows[0].n,10_000_000);
  await pool.query('UPDATE credit_wallets SET frozen=true WHERE owner_id=\'owner\'');await assert.rejects(wallet.reserve('owner','frozen_owner',1),/frozen/);await pool.query('UPDATE credit_wallets SET frozen=false WHERE owner_id=\'owner\'');
 });
 await t.test('suspension removes sessions, cancels queued work with released credits, restore does not restore sessions',async()=>{
  await wallet.grant('alice',{provider:'stripe_test',receipt:'cs_test_suspend',credits:10,netMicros:5_000_000});const id=await wallet.reserve('alice','queued_to_cancel',100_000,5000,{inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),maxRuntimeMs:1000,hourlyMicros:10000,fixedCostMicros:0});
  await pool.query('INSERT INTO "session"(id,token,"userId","expiresAt","updatedAt") VALUES(\'session1\',\'secret-fixture\',\'alice\',now()+interval \'1 day\',now())');await assert.rejects(store.user('alice','owner',true),/Administrator/);await assert.rejects(store.user('owner','owner',true),/cannot be suspended/);
  await store.user('owner','alice',true);assert.equal((await pool.query('SELECT count(*)::int n FROM "session" WHERE "userId"=\'alice\'')).rows[0].n,0);assert.equal((await pool.query('SELECT status FROM generation_reservations WHERE id=$1',[id])).rows[0].status,'cancelled');assert.deepEqual(await wallet.balance('alice'),{available:10,reserved:0});await assert.rejects(wallet.reserve('alice','suspended_request',1),/suspended/);await store.user('owner','alice',false);assert.equal((await pool.query('SELECT suspended FROM "user" WHERE id=\'alice\'')).rows[0].suspended,false);
 });
 await t.test('verified live and test receipts stay separate; wrong-mode signed events fail',async()=>{
  const testConfig={price:'price_test',product:'prod_test'},liveConfig={price:'price_live',product:'prod_live',live:true};let live=false;
  const price=()=>({id:live?'price_live':'price_test',active:true,livemode:live,currency:'usd',unit_amount:7999,type:'one_time',tax_behavior:'exclusive',product:{id:live?'prod_live':'prod_test',active:true,metadata:{jamloom_product:'academy-complete'}}});
  const receipt=()=>({id:live?'cs_live_fixture':'cs_test_fixture',livemode:live,mode:'payment',payment_status:'paid',client_reference_id:'alice',payment_intent:live?'pi_live':'pi_test',currency:'usd',amount_subtotal:7999,total_details:{amount_discount:0},metadata:{jamloom_product:'academy-complete'},line_items:{data:[{quantity:1,amount_subtotal:7999,price:price()}]}});
  const sdk={prices:{retrieve:async()=>price()},checkout:{sessions:{retrieve:async()=>receipt()}}} as unknown as Stripe,academy=new AcademyStore(pool);
  await grantAcademy(sdk,pool,'cs_test_fixture',testConfig);assert.equal(await academy.access('alice'),true);let settings=await siteSettings(pool);await store.settings('owner',{...settings,billing_mode:'live'},liveEnv);assert.equal(await academy.access('alice'),false);
  await assert.rejects(verifiedAcademyPrice(sdk,liveConfig));live=true;await verifiedAcademyPrice(sdk,liveConfig);await grantAcademy(sdk,pool,'cs_live_fixture',liveConfig);assert.equal(await academy.access('alice'),true);
  await assert.rejects(academyWebhook(sdk,pool,{livemode:false} as Stripe.Event,'{}',liveConfig),/mismatch/);
  await pool.query("UPDATE academy_purchases SET refund_hold=true WHERE receipt='cs_live_fixture'");assert.equal(await academy.access('alice'),false);settings=await siteSettings(pool);await store.settings('owner',{...settings,billing_mode:'test'});assert.equal(await academy.access('alice'),true);
 });
 }finally{await pool.end();await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();await rm(folder,{recursive:true,force:true});}
});
