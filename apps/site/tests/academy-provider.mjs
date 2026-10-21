// Actual Stripe test-mode checkout and webhook delivery; disposable local Postgres.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';import Stripe from 'stripe';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),'Test key required');
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_academy_stripe_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-academy-')),base='http://127.0.0.1:4227';
const evidence=new URL('../../../docs/evidence/academy-inline-provider/',import.meta.url);
let server,listener,proxy,logs='',providerLogs='',deferGrants=false;const deliveries=[];const results={database:'disposable loopback',human_learning:'NOT RUN',provider_transactions:'NOT RUN',browser:'Chromium embedded Checkout on Jamloom; muted output'};
try{
 await migrate(pool);await mkdir(evidence,{recursive:true});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);assert.equal((await stripe.accounts.retrieve()).id,'acct_1TxA3vDlEXWDEeHO');
 proxy=createServer(async(req,res)=>{try{const parts=[];for await(const chunk of req)parts.push(chunk);const body=Buffer.concat(parts).toString();const event=JSON.parse(body);deliveries.push({event,raw:body,signature:req.headers['stripe-signature']});if(deferGrants&&event.type==='checkout.session.completed'){res.writeHead(200);res.end('queued by test proxy');return;}const response=await fetch(base+'/api/academy/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':req.headers['stripe-signature']},body});res.writeHead(response.status);res.end(await response.text());}catch{res.writeHead(500);res.end();}});await new Promise(resolve=>proxy.listen(4228,'127.0.0.1',resolve));
 listener=spawn('stripe',['listen','--forward-to','http://127.0.0.1:4228','--events','checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed'],{env:{...process.env,STRIPE_API_KEY:process.env.STRIPE_SECRET_KEY},stdio:['ignore','pipe','pipe']});
 listener.stdout.on('data',s=>providerLogs+=s);listener.stderr.on('data',s=>providerLogs+=s);
 for(let i=0;i<100&&!providerLogs.match(/whsec_[A-Za-z0-9]+/);i++)await delay(100);
 const secret=providerLogs.match(/whsec_[A-Za-z0-9]+/)?.[0];assert.ok(secret,'Stripe listener did not connect');
 const env={...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:'whsec_local_fixture',ACADEMY_STRIPE_WEBHOOK_SECRET:secret,ACADEMY_STRIPE_PRICE_ID:process.env.ACADEMY_STRIPE_PRICE_ID,ACADEMY_STRIPE_PRODUCT_ID:process.env.ACADEMY_STRIPE_PRODUCT_ID};
 delete env.VERCEL;delete env.RESEND_API_KEY;env.ACADEMY_STRIPE_SANDBOX_ENABLED='true';
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4227'],{env,cwd:new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/academy')).ok)break;}catch{}await delay(100);if(i===99)throw new Error('Server start timeout');}
 let address=1;
 async function api(path,{method='GET',body,cookie,origin=base,headers={}}={}){return fetch(base+path,{method,headers:{origin,'Content-Type':'application/json','x-real-ip':`192.0.2.${address++}`,...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
 async function account(email){
  const password='Jamloom-local-academy-password-739';assert.equal((await api('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'Local Academy learner'}})).status,200);
  let message;for(let i=0;i<50&&!message;i++){try{for(const f of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
  assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
  const login=await api('/api/auth/sign-in/email',{method:'POST',body:{email,password}});assert.equal(login.status,200);
  return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }

 const cookie=await account('academy-provider@example.test');
 const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['academy-provider@example.test'])).rows[0].id;

 const browser=await chromium.launch({args:['--mute-audio']});let page;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1100}});page=await context.newPage();page.setDefaultTimeout(20000);
  await context.addCookies(cookie.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
  async function waitAccess(expected){for(let n=0;n<120;n++){const result=await(await api('/api/academy/progress',{cookie})).json();if(result.access===expected)return;await delay(500);}throw Error('Provider access did not reconcile to '+expected);}
  async function purchase(declineFirst=false,card='4242424242424242',verifyGrant=true){
   await page.goto(base+'/academy/checkout');
   const response=page.waitForResponse(r=>r.url()===base+'/api/academy/checkout'&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Pay securely on Jamloom · test mode'}).click();
   const created=await response;assert.equal(created.status(),200);const data=await created.json(),id=data.sessionId;
   const request={method:'POST',cookie,body:created.request().postDataJSON()};
   assert.equal((await(await api('/api/academy/checkout',request)).json()).clientSecret,data.clientSecret,'Checkout idempotency');
   assert.equal(data.url,undefined);console.log('Embedded checkout',id);(results.started_sessions??=[]).push(id);
   const form=page.frameLocator('.inline-checkout iframe');
   if(declineFirst){await form.locator('#email').waitFor();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Checkout mobile overflow');await page.screenshot({path:new URL('mobile.png',evidence).pathname});await page.getByRole('button',{name:'Close payment form',exact:true}).click();const reopened=page.waitForResponse(r=>r.url()===base+'/api/academy/checkout'&&r.request().method()==='POST');await page.getByRole('button',{name:'Pay securely on Jamloom · test mode'}).click();assert.equal((await(await reopened).json()).sessionId,id);await page.setViewportSize({width:1280,height:1100});results.close_and_reopen='PASS: same session';}
   await form.locator('#email').fill('academy-provider@example.test');
   // Stripe's expanded accordion cover owns the click at the visible Card label.
   await form.getByText('Card',{exact:true}).click({force:true});
   await form.locator('#cardNumber').fill(declineFirst?'4000000000000002':card);
   await form.locator('#cardExpiry').fill('12/34');await form.locator('#cardCvc').fill('123');await form.locator('#billingName').fill('Jamloom Sandbox Learner');
   await form.locator('#billingCountry').selectOption('US');
   const manual=form.getByRole('button',{name:'Enter address manually',exact:true});if(await manual.isVisible())await manual.click();
   await form.locator('#billingAddressLine1').fill('354 Oyster Point Blvd');await form.locator('#billingLocality').fill('South San Francisco');
   await form.locator('#billingPostalCode').fill('94080');await form.locator('#billingAdministrativeArea').selectOption('CA');
   if(await form.locator('#enableStripePass').isChecked()){await form.locator('#enableStripePass').focus();await form.locator('#enableStripePass').press('Space');assert.equal(await form.locator('#enableStripePass').isChecked(),false);}
   await page.waitForTimeout(1500);await form.locator('button[type=submit]').click();
   if(declineFirst){await form.getByText(/Your (?:credit )?card was declined/i).first().waitFor({timeout:60000});assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases WHERE owner_id=$1',[owner])).rows[0].n,0);const declined=await stripe.checkout.sessions.retrieve(id,{expand:['payment_intent']});assert.equal(declined.payment_status,'unpaid');assert.equal(declined.payment_intent?.last_payment_error?.code,'card_declined');results.declined_payment='PASS';await page.screenshot({path:new URL('declined.png',evidence).pathname});await form.locator('#cardNumber').fill('4242424242424242');await form.locator('button[type=submit]').click();}
   await page.locator('.checkout-confirmation').waitFor({timeout:90000});assert.equal(page.url(),base+'/academy/checkout');if(verifyGrant){await waitAccess(true);await page.getByRole('heading',{name:'Academy access verified'}).waitFor({timeout:30000});}
   const session=await stripe.checkout.sessions.retrieve(id);assert.equal(session.livemode,false);assert.equal(session.payment_status,'paid');
   await page.screenshot({path:new URL(verifyGrant?'verified.png':'pending.png',evidence).pathname});
   return session;
  }
  const first=await purchase(true);console.log('PASS provider purchase and real signed webhook',first.id);
  assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases WHERE receipt=$1',[first.id])).rows[0].n,1);
  const delivery=deliveries.find(d=>d.event.type==='checkout.session.completed'&&d.event.data.object.id===first.id);assert.ok(delivery);
  const replay=()=>fetch(base+'/api/academy/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload:delivery.raw,secret})},body:delivery.raw});
  assert.equal((await replay()).status,200);assert.equal((await replay()).status,200);
  assert.equal((await fetch(base+'/api/academy/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':'invalid'},body:delivery.raw})).status,400);
  assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases WHERE receipt=$1',[first.id])).rows[0].n,1);
  assert.equal((await api('/api/academy/checkout?session_id='+first.id)).status,401);
  assert.equal((await(await api('/api/academy/checkout?session_id='+first.id,{cookie})).json()).status,'active');
  const other=await account('other-provider@example.test');assert.equal((await(await api('/api/academy/checkout?session_id='+first.id,{cookie:other})).json()).status,'pending');assert.equal((await(await api('/api/academy/progress',{cookie:other})).json()).access,false);
  const refund=await stripe.refunds.create({payment_intent:first.payment_intent},{idempotencyKey:'academy-test-refund:'+first.id});assert.equal(refund.status,'succeeded');await waitAccess(false);console.log('PASS provider refund and access withdrawal',refund.id);assert.equal((await(await api('/api/academy/checkout?session_id='+first.id,{cookie})).json()).status,'reversed');
  const second=await purchase();assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases WHERE owner_id=$1',[owner])).rows[0].n,2);console.log('PASS provider repurchase',second.id);
  assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  const cleanup=await stripe.refunds.create({payment_intent:second.payment_intent},{idempotencyKey:'academy-test-refund:'+second.id});assert.equal(cleanup.status,'succeeded');await waitAccess(false);
  // Delay a genuine provider grant at the test proxy so the genuine refund arrives first.
  deferGrants=true;const early=await purchase(false,'4242424242424242',false);
  const earlyRefund=await stripe.refunds.create({payment_intent:early.payment_intent},{idempotencyKey:'academy-test-refund:'+early.id});assert.equal(earlyRefund.status,'succeeded');
  for(let n=0;n<120;n++){if((await pool.query('SELECT refund_hold FROM academy_purchase_holds WHERE receipt=$1',[early.id])).rows[0]?.refund_hold)break;await delay(500);}
  assert.equal((await pool.query('SELECT refund_hold FROM academy_purchase_holds WHERE receipt=$1',[early.id])).rows[0]?.refund_hold,true);
  const queued=deliveries.find(d=>d.event.type==='checkout.session.completed'&&d.event.data.object.id===early.id);assert.ok(queued);deferGrants=false;
  assert.equal((await fetch(base+'/api/academy/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':queued.signature},body:queued.raw})).status,200);
  const earlyRow=(await pool.query('SELECT refund_hold FROM academy_purchases WHERE receipt=$1',[early.id])).rows[0];assert.equal(earlyRow.refund_hold,true);await waitAccess(false);
  results.refund_before_grant={status:'PASS',session:early.id,refund:earlyRefund.id,ordering:'genuine signed provider grant delayed by test proxy until refund processed'};console.log('PASS refund before delayed grant',early.id);
  results.dispute_cases=[];
  for(const outcome of ['won','lost']){
   const disputed=await purchase(false,'4000000000000259',false);let dispute;
   for(let n=0;n<120&&!dispute;n++){dispute=(await stripe.disputes.list({payment_intent:disputed.payment_intent,limit:2})).data[0];if(!dispute)await delay(500);}assert.ok(dispute);assert.equal(dispute.livemode,false);
   for(let n=0;n<120;n++){if((await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[disputed.id])).rows[0]?.dispute_hold)break;await delay(500);}
   assert.equal((await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[disputed.id])).rows[0]?.dispute_hold,true);await waitAccess(false);
   await stripe.disputes.update(dispute.id,{evidence:{uncategorized_text:outcome==='won'?'winning_evidence':'losing_evidence'},submit:true});
   for(let n=0;n<120;n++){dispute=await stripe.disputes.retrieve(dispute.id);if(dispute.status===outcome)break;await delay(500);}assert.equal(dispute.status,outcome);
   for(let n=0;n<120;n++){const closed=deliveries.find(d=>d.event.type==='charge.dispute.closed'&&d.event.data.object.id===dispute.id);if(closed&&(await pool.query('SELECT 1 FROM academy_purchase_events WHERE event_id=$1',[closed.event.id])).rowCount&&!!(await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[disputed.id])).rows[0]?.dispute_hold===(outcome!=='won'))break;await delay(500);}
   const closed=deliveries.find(d=>d.event.type==='charge.dispute.closed'&&d.event.data.object.id===dispute.id);assert.ok(closed);assert.equal((await pool.query('SELECT 1 FROM academy_purchase_events WHERE event_id=$1',[closed.event.id])).rowCount,1);
   assert.equal((await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[disputed.id])).rows[0]?.dispute_hold,outcome!=='won');await waitAccess(outcome==='won');
   results.dispute_cases.push({session:disputed.id,dispute:dispute.id,outcome,status:'PASS'});console.log('PASS actual test dispute',outcome,dispute.id);
   if(outcome==='won'){const reversal=await stripe.refunds.create({payment_intent:disputed.payment_intent},{idempotencyKey:'academy-test-refund:'+disputed.id});assert.equal(reversal.status,'succeeded');await waitAccess(false);}
  }
  assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  Object.assign(results,{status:'PASS',provider_transactions:'PASS: Stripe test mode; no funds moved',account:'acct_1TxA3vDlEXWDEeHO',sessions:[first.id,second.id],refunds:[refund.id,cleanup.id],signed_provider_delivery:'PASS via Stripe CLI to actual HTTP handler',duplicate_real_event_replay:'PASS (captured payload signed again locally)',invalid_signature:'PASS',wrong_owner:'PASS',repurchase:'PASS',generation_credits:0,live_payments:'NOT RUN',disputes:'PASS: actual Stripe test-mode win and loss, real signed deliveries'});
 }catch(error){results.status='FAIL';results.error=error.message;await writeFile(new URL('provider.json',evidence),JSON.stringify(results,null,2)+'\n');if(page){await page.screenshot({path:new URL('failure.png',evidence).pathname});await writeFile(new URL('failure.txt',evidence),await page.locator('body').innerText());}console.error(error.message);throw error;}finally{await browser.close();}
 await writeFile(new URL('provider.json',evidence),JSON.stringify(results,null,2)+'\n');
}finally{
 if(listener&&listener.exitCode===null)listener.kill('SIGTERM');if(proxy)await new Promise(resolve=>proxy.close(resolve));
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await writeFile(new URL('server.log',evidence),logs);await writeFile(new URL('listener.log',evidence),providerLogs.replace(/whsec_[A-Za-z0-9]+/g,'[redacted]'));
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
