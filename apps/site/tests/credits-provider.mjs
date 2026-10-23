// Actual Stripe test-mode checkout and webhook delivery; disposable local Postgres.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';import Stripe from 'stripe';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
if(!process.env.STRIPE_SECRET_KEY)process.loadEnvFile('.env.local');
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),'Test key required');
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_credits_stripe_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-credits-')),base='http://127.0.0.1:4257';
const evidence=new URL('../../../renders/credits-provider/',import.meta.url);
let server,listener,proxy,logs='',providerLogs='',deferGrants=false;const deliveries=[];const results={database:'disposable loopback',human_learning:'NOT RUN',provider_transactions:'NOT RUN',browser:'Chromium hosted Checkout; muted output'};
try{
 await migrate(pool);await mkdir(evidence,{recursive:true});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);assert.equal((await stripe.accounts.retrieve()).id,'acct_1TxA3vDlEXWDEeHO');
 proxy=createServer(async(req,res)=>{try{const parts=[];for await(const chunk of req)parts.push(chunk);const body=Buffer.concat(parts).toString();const event=JSON.parse(body);deliveries.push({event,raw:body,signature:req.headers['stripe-signature']});if(deferGrants&&event.type==='checkout.session.completed'){res.writeHead(200);res.end('queued by test proxy');return;}const response=await fetch(base+'/api/payments/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':req.headers['stripe-signature']},body});res.writeHead(response.status);res.end(await response.text());}catch{res.writeHead(500);res.end();}});await new Promise(resolve=>proxy.listen(4258,'127.0.0.1',resolve));
 listener=spawn('stripe',['listen','--forward-to','http://127.0.0.1:4258','--events','checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed'],{env:{...process.env,STRIPE_API_KEY:process.env.STRIPE_SECRET_KEY},stdio:['ignore','pipe','pipe']});
 listener.stdout.on('data',s=>providerLogs+=s);listener.stderr.on('data',s=>providerLogs+=s);
 for(let i=0;i<100&&!providerLogs.match(/whsec_[A-Za-z0-9]+/);i++)await delay(100);
 const secret=providerLogs.match(/whsec_[A-Za-z0-9]+/)?.[0];assert.ok(secret,'Stripe listener did not connect');
 const env={...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:secret,PRO_STRIPE_WEBHOOK_SECRET:'whsec_unused',PRO_STRIPE_PRICE_ID:process.env.PRO_STRIPE_PRICE_ID,PRO_STRIPE_PRODUCT_ID:process.env.PRO_STRIPE_PRODUCT_ID};
 delete env.VERCEL;delete env.RESEND_API_KEY;env.JAMLOOM_CREDIT_PURCHASES_ENABLED='true';env.CREDIT_BILLING_MODE='test';env.CREDIT_STRIPE_TAX_CODE='txcd_10000000';env.JAMLOOM_CLOUD_SONGS_ENABLED='false';
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4257'],{env,cwd:new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/pro')).ok)break;}catch{}await delay(100);if(i===99)throw new Error('Server start timeout');}
 let address=1;
 async function api(path,{method='GET',body,cookie,origin=base,headers={}}={}){return fetch(base+path,{method,headers:{origin,'Content-Type':'application/json','x-real-ip':`192.0.2.${address++}`,...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
 async function account(email){
  const password='Jamloom-local-pro-password-739';assert.equal((await api('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'Local Pro learner'}})).status,200);
  let message;for(let i=0;i<50&&!message;i++){try{for(const f of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
  assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
  const login=await api('/api/auth/sign-in/email',{method:'POST',body:{email,password}});assert.equal(login.status,200);
  return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }

 const cookie=await account('credits-provider@example.test');
 const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['credits-provider@example.test'])).rows[0].id;

 const browser=await chromium.launch({args:['--mute-audio']});let page;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1100}});page=await context.newPage();page.setDefaultTimeout(30000);
  await context.addCookies(cookie.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
  await page.goto(base+'/account/credits');
  let checkoutResult;const response=new Promise(resolve=>{checkoutResult=resolve;});
  await context.route(base+'/api/payments/checkout',async route=>{const result=await route.fetch(),data=await result.json();checkoutResult({status:result.status(),data,body:route.request().postDataJSON()});await route.fulfill({response:result});});
  await page.getByRole('button',{name:'10 credits · $9.99'}).click();const created=await response;assert.equal(created.status,200);const data=created.data,id=data.sessionId;
  assert.equal((await(await api('/api/payments/checkout',{method:'POST',cookie,body:created.body})).json()).sessionId,id);
  await page.waitForURL('https://checkout.stripe.com/**');
  await page.locator('#email').fill('credits-provider@example.test');
  const card=page.getByText('Card',{exact:true});if(await card.isVisible())await card.click({force:true});
  await page.locator('#cardNumber').fill('4000000000000002');await page.locator('#cardExpiry').fill('12/34');await page.locator('#cardCvc').fill('123');await page.locator('#billingName').fill('Jamloom Sandbox Buyer');
  await page.locator('#billingCountry').selectOption('US');
  const manual=page.getByRole('button',{name:'Enter address manually',exact:true});if(await manual.isVisible())await manual.click();
  for(const [field,value]of [['billingAddressLine1','354 Oyster Point Blvd'],['billingLocality','South San Francisco'],['billingPostalCode','94080']])if(await page.locator('#'+field).isVisible())await page.locator('#'+field).fill(value);
  if(await page.locator('#billingAdministrativeArea').isVisible())await page.locator('#billingAdministrativeArea').selectOption('CA');
  if(await page.locator('#enableStripePass').isVisible()&&await page.locator('#enableStripePass').isChecked())await page.locator('#enableStripePass').uncheck();
  await page.waitForTimeout(1500);await page.locator('button[type=submit]').click();
  await page.getByText(/Your (?:credit )?card was declined/i).first().waitFor({timeout:60000});assert.equal((await stripe.checkout.sessions.retrieve(id)).payment_status,'unpaid');assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  await page.locator('#cardNumber').fill('4242424242424242');await page.locator('button[type=submit]').click();await page.waitForURL(base+'/account/credits?payment=complete&session_id=*',{timeout:90000});
  await page.getByText('Payment verified. Your credits are ready.').waitFor({timeout:60000});await page.getByText('Available: 10 · Reserved: 0').waitFor();
  const session=await stripe.checkout.sessions.retrieve(id);assert.equal(session.livemode,false);assert.equal(session.payment_status,'paid');assert.equal(session.amount_subtotal,999);
  await page.screenshot({path:new URL('purchased.png',evidence).pathname});
  const delivery=deliveries.find(d=>d.event.type==='checkout.session.completed'&&d.event.data.object.id===id);assert.ok(delivery);
  for(let i=0;i<2;i++)assert.equal((await fetch(base+'/api/payments/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload:delivery.raw,secret})},body:delivery.raw})).status,200);
  assert.equal((await fetch(base+'/api/payments/stripe',{method:'POST',headers:{'stripe-signature':'invalid'},body:delivery.raw})).status,400);
  assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int n FROM pro_purchases')).rows[0].n,0);
  const other=await account('other-credits-provider@example.test');assert.equal((await api('/api/payments/checkout?session_id='+id,{cookie:other})).status,404);
  const refund=await stripe.refunds.create({payment_intent:session.payment_intent},{idempotencyKey:'jamloom-credit-test-refund:'+id});assert.equal(refund.status,'succeeded');
  let frozen=false;for(let n=0;n<120;n++){frozen=(await pool.query('SELECT frozen FROM credit_wallets WHERE owner_id=$1',[owner])).rows[0]?.frozen;if(frozen)break;await delay(500);}assert(frozen,'Refund must freeze credits');
  Object.assign(results,{status:'PASS',checkout:id,refund:refund.id,provider_transactions:'Stripe TEST only; no funds moved',signedWebhook:'PASS',declinedPayment:'PASS',duplicateDelivery:'PASS',wrongOwner:'PASS',refundHold:'PASS',creditsGranted:10,liveCharge:'NOT RUN'});
  await writeFile(new URL('report.json',evidence),JSON.stringify(results,null,2)+'\n');console.log('PASS actual credit checkout, signed webhook, ten credits and refund hold');
 }catch(error){results.status='FAIL';results.error=error.message;await writeFile(new URL('failure.json',evidence),JSON.stringify(results,null,2));if(page){await page.screenshot({path:new URL('failure.png',evidence).pathname});await writeFile(new URL('failure.txt',evidence),await page.locator('body').innerText());}throw error;}finally{await browser.close();}
}finally{
 if(listener&&listener.exitCode===null)listener.kill('SIGTERM');if(proxy)await new Promise(resolve=>proxy.close(resolve));
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await writeFile(new URL('server.log',evidence),logs);await writeFile(new URL('listener.log',evidence),providerLogs.replace(/whsec_[A-Za-z0-9]+/g,'[redacted]'));
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
