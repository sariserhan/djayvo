// Actual Stripe test-mode checkout and webhook delivery; disposable local Postgres.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';import Stripe from 'stripe';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),'Test key required');
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_pro_stripe_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-pro-')),base='http://127.0.0.1:4227';
const evidence=new URL('../../../renders/pro-provider/',import.meta.url);
let server,listener,proxy,logs='',providerLogs='',deferGrants=false;const deliveries=[];const results={database:'disposable loopback',human_learning:'NOT RUN',provider_transactions:'NOT RUN',browser:'Chromium hosted Checkout; muted output'};
try{
 await migrate(pool);await mkdir(evidence,{recursive:true});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);assert.equal((await stripe.accounts.retrieve()).id,'acct_1TxA3vDlEXWDEeHO');
 proxy=createServer(async(req,res)=>{try{const parts=[];for await(const chunk of req)parts.push(chunk);const body=Buffer.concat(parts).toString();const event=JSON.parse(body);deliveries.push({event,raw:body,signature:req.headers['stripe-signature']});if(deferGrants&&event.type==='checkout.session.completed'){res.writeHead(200);res.end('queued by test proxy');return;}const response=await fetch(base+'/api/pro/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':req.headers['stripe-signature']},body});res.writeHead(response.status);res.end(await response.text());}catch{res.writeHead(500);res.end();}});await new Promise(resolve=>proxy.listen(4228,'127.0.0.1',resolve));
 listener=spawn('stripe',['listen','--forward-to','http://127.0.0.1:4228','--events','checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed'],{env:{...process.env,STRIPE_API_KEY:process.env.STRIPE_SECRET_KEY},stdio:['ignore','pipe','pipe']});
 listener.stdout.on('data',s=>providerLogs+=s);listener.stderr.on('data',s=>providerLogs+=s);
 for(let i=0;i<100&&!providerLogs.match(/whsec_[A-Za-z0-9]+/);i++)await delay(100);
 const secret=providerLogs.match(/whsec_[A-Za-z0-9]+/)?.[0];assert.ok(secret,'Stripe listener did not connect');
 const env={...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:'whsec_local_fixture',PRO_STRIPE_WEBHOOK_SECRET:secret,PRO_STRIPE_PRICE_ID:process.env.PRO_STRIPE_PRICE_ID,PRO_STRIPE_PRODUCT_ID:process.env.PRO_STRIPE_PRODUCT_ID};
 delete env.VERCEL;delete env.RESEND_API_KEY;env.PRO_SALES_ENABLED='true';env.PRO_BILLING_MODE='test';
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4227'],{env,cwd:new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
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

 const cookie=await account('pro-provider@example.test');
 const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['pro-provider@example.test'])).rows[0].id;

 const browser=await chromium.launch({args:['--mute-audio']});let page;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1100}});page=await context.newPage();page.setDefaultTimeout(30000);
  await context.addCookies(cookie.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
  assert.equal((await api('/api/pro/license',{method:'POST',cookie})).status,403);
  assert.equal((await api('/studio/dj.html',{cookie})).headers.get('location'),'/pro');
  async function waitAccess(expected){for(let n=0;n<120;n++){const r=await api('/api/pro/access',{cookie});if(r.ok&&(await r.json()).active===expected)return;await delay(500);}throw Error('Pro access did not reconcile');}
  await page.goto(base+'/pro');
  const response=page.waitForResponse(r=>r.url()===base+'/api/pro/checkout'&&r.request().method()==='POST').then(async r=>({status:r.status(),data:await r.json(),body:r.request().postDataJSON()}));
  await page.getByRole('button',{name:'Buy Pro v1 — $49 once'}).click();const created=await response;assert.equal(created.status,200);const data=created.data,id=data.sessionId;
  assert.equal((await(await api('/api/pro/checkout',{method:'POST',cookie,body:created.body})).json()).sessionId,id);
  await page.waitForURL('https://checkout.stripe.com/**');
  await page.locator('#email').fill('pro-provider@example.test');
  const card=page.getByText('Card',{exact:true});if(await card.isVisible())await card.click({force:true});
  await page.locator('#cardNumber').fill('4000000000000002');await page.locator('#cardExpiry').fill('12/34');await page.locator('#cardCvc').fill('123');await page.locator('#billingName').fill('Jamloom Sandbox Buyer');
  await page.locator('#billingCountry').selectOption('US');
  const manual=page.getByRole('button',{name:'Enter address manually',exact:true});if(await manual.isVisible())await manual.click();
  for(const [field,value]of [['billingAddressLine1','354 Oyster Point Blvd'],['billingLocality','South San Francisco'],['billingPostalCode','94080']])if(await page.locator('#'+field).isVisible())await page.locator('#'+field).fill(value);
  if(await page.locator('#billingAdministrativeArea').isVisible())await page.locator('#billingAdministrativeArea').selectOption('CA');
  if(await page.locator('#enableStripePass').isVisible()&&await page.locator('#enableStripePass').isChecked())await page.locator('#enableStripePass').uncheck();
  await page.waitForTimeout(1500);await page.locator('button[type=submit]').click();
  await page.getByText(/Your (?:credit )?card was declined/i).first().waitFor({timeout:60000});assert.equal((await stripe.checkout.sessions.retrieve(id)).payment_status,'unpaid');assert.equal((await pool.query('SELECT count(*)::int n FROM pro_purchases')).rows[0].n,0);
  await page.locator('#cardNumber').fill('4242424242424242');await page.locator('button[type=submit]').click();await page.waitForURL(base+'/pro?payment=complete',{timeout:90000});await waitAccess(true);await page.goto(base+'/pro');await page.getByRole('heading',{name:'Your Pro access is active'}).waitFor();
  const session=await stripe.checkout.sessions.retrieve(id);assert.equal(session.livemode,false);assert.equal(session.payment_status,'paid');assert.equal(session.amount_subtotal,4900);
  await page.screenshot({path:new URL('purchased.png',evidence).pathname});
  await page.getByText('Use the web studio offline',{exact:true}).click();await page.getByRole('button',{name:'Keep web studio available offline'}).click();await page.getByText(/Web studio saved/).waitFor({timeout:75000});await page.goto(base+'/studio/dj.html');await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);assert.equal((await page.goto(base+'/studio/dj.html')).status(),200);await page.waitForSelector('#sample-pad-7',{state:'attached'});
  await page.evaluate(async()=>{for(const key of await caches.keys()){const cache=await caches.open(key),r=await cache.match(location.href);if(r){const headers=new Headers(r.headers);headers.set('X-Jamloom-Pro-Expires','1');await cache.put(location.href,new Response(await r.arrayBuffer(),{headers}));}}});
  assert.equal((await page.reload()).status(),503);await context.setOffline(false);assert.equal((await page.goto(base+'/studio/dj.html')).status(),200);await page.waitForSelector('#sample-pad-7',{state:'attached'});
  results.offlineAccess='PASS: paid cache, expiry, online renewal';
  const licenseResponse=await api('/api/pro/license',{method:'POST',cookie});assert.equal(licenseResponse.status,200);const token=await licenseResponse.text();const {verifyLicense}=await import('../lib/pro-license.ts');assert.equal(verifyLicense(token)?.subject,owner);assert.equal(verifyLicense(token)?.sandbox,true);
  assert.equal((await api('/api/pro/refresh',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,401);
  assert.equal((await api('/studio/dj.html',{cookie})).status,200);
  const delivery=deliveries.find(d=>d.event.type==='checkout.session.completed'&&d.event.data.object.id===id);assert.ok(delivery);
  for(let i=0;i<2;i++)assert.equal((await fetch(base+'/api/pro/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload:delivery.raw,secret})},body:delivery.raw})).status,200);
  assert.equal((await fetch(base+'/api/pro/stripe',{method:'POST',headers:{'stripe-signature':'invalid'},body:delivery.raw})).status,400);
  assert.equal((await pool.query('SELECT count(*)::int n FROM pro_purchases')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  const other=await account('other-pro-provider@example.test');assert.equal((await api('/api/pro/license',{method:'POST',cookie:other})).status,403);
  const refund=await stripe.refunds.create({payment_intent:session.payment_intent},{idempotencyKey:'jamloom-pro-test-refund:'+id});assert.equal(refund.status,'succeeded');await waitAccess(false);assert.equal((await api('/api/pro/license',{method:'POST',cookie})).status,403);assert.equal((await api('/studio/dj.html',{cookie})).status,307);await page.goto(base+'/studio/dj.html');await page.waitForURL(base+'/pro');results.cachedRefundRevocation='PASS';
  Object.assign(results,{status:'PASS',checkout:id,refund:refund.id,provider_transactions:'Stripe TEST only; no funds moved',signedWebhook:'PASS',declinedPayment:'PASS',duplicateDelivery:'PASS',wrongOwner:'PASS',licenseSignature:'PASS',sandboxCannotActivateRelease:'PASS',refundRevocation:'PASS',creditsGranted:0,liveCharge:'NOT RUN'});
  await writeFile(new URL('report.json',evidence),JSON.stringify(results,null,2)+'\n');console.log('PASS actual Pro checkout, signed webhook, activation file and refund');
 }catch(error){results.status='FAIL';results.error=error.message;await writeFile(new URL('failure.json',evidence),JSON.stringify(results,null,2));if(page){await page.screenshot({path:new URL('failure.png',evidence).pathname});await writeFile(new URL('failure.txt',evidence),await page.locator('body').innerText());}throw error;}finally{await browser.close();}
}finally{
 if(listener&&listener.exitCode===null)listener.kill('SIGTERM');if(proxy)await new Promise(resolve=>proxy.close(resolve));
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await writeFile(new URL('server.log',evidence),logs);await writeFile(new URL('listener.log',evidence),providerLogs.replace(/whsec_[A-Za-z0-9]+/g,'[redacted]'));
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
