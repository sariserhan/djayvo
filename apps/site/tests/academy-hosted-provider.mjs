// Explicit owner-authorized test-mode purchase/refund against the permanent deployed webhook.
import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';import{mkdir,writeFile}from'node:fs/promises';import{setTimeout as delay}from'node:timers/promises';
import{chromium}from'playwright';import Stripe from'stripe';import{createPool}from'../lib/database.ts';import{OWNER_EMAIL}from'../lib/admin-access.ts';import{academyCheckout}from'../lib/academy-payments.ts';import{AcademyStore}from'../lib/academy-store.ts';
assert.equal(process.env.JAMLOOM_HOSTED_ACADEMY_TEST,'1','Explicit hosted test authorization required');assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-flat-hill-b4q0lix4-pooler.c-6.us-east-2.aws.neon.tech');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),pool=createPool(process.env.DATABASE_URL),store=new AcademyStore(pool),base='https://www.jamloom.com';
const evidence=new URL('../../../docs/evidence/academy-hosted-provider/',import.meta.url);await mkdir(evidence,{recursive:true});
let browser,page,session,refunded=false;const result={status:'RUNNING',live_charges:0,account:'acct_1TxA3vDlEXWDEeHO',checkout_creation:'Authorized server operations command; no owner browser session fabricated',delivery:'Permanent Stripe webhook to production app/database; no CLI forwarding'};
async function waitFor(check,label){for(let n=0;n<120;n++){if(await check())return;await delay(1000);}throw Error(label+' timed out');}
try{
 assert.equal((await stripe.accounts.retrieve()).id,result.account);
 const owner=(await pool.query('SELECT id,"emailVerified",suspended FROM "user" WHERE email=$1',[OWNER_EMAIL])).rows[0];assert.ok(owner?.emailVerified&&!owner.suspended);
 assert.equal(await store.access(owner.id,pool,false),false,'Existing owner test entitlement must be reviewed first');
 const before=(await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n;
 for(const mode of ['test','live'])assert.equal((await fetch(base+'/api/academy/stripe?mode='+mode,{method:'POST',headers:{'content-type':'application/json','stripe-signature':'invalid'},body:'{}'})).status,400);
 const config={product:process.env.ACADEMY_STRIPE_PRODUCT_ID,price:process.env.ACADEMY_STRIPE_PRICE_ID,live:false};
 session=await academyCheckout(stripe,pool,owner.id,'hosted_'+randomUUID(),base,config);assert.equal(session.livemode,false);result.session=session.id;
 browser=await chromium.launch({args:['--mute-audio']});page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(20000);
 await page.goto(session.url);await page.locator('#email').fill('academy-hosted-owner@example.test');await page.getByText('Card',{exact:true}).click({force:true});
 await page.locator('#cardNumber').fill('4242424242424242');await page.locator('#cardExpiry').fill('12/34');await page.locator('#cardCvc').fill('123');await page.locator('#billingName').fill('Jamloom Hosted Test');await page.locator('#billingCountry').selectOption('US');
 const manual=page.getByRole('button',{name:'Enter address manually',exact:true});if(await manual.isVisible())await manual.click();
 await page.locator('#billingAddressLine1').fill('354 Oyster Point Blvd');await page.locator('#billingLocality').fill('South San Francisco');await page.locator('#billingPostalCode').fill('94080');await page.locator('#billingAdministrativeArea').selectOption('CA');
 if(await page.locator('#enableStripePass').isChecked())await page.locator('#enableStripePass').uncheck();await page.waitForTimeout(1500);await page.locator('button[type=submit]').click();
 await waitFor(async()=>{session=await stripe.checkout.sessions.retrieve(session.id);return session.payment_status==='paid';},'Stripe test payment');assert.equal(session.livemode,false);
 await waitFor(()=>store.access(owner.id,pool,false),'Hosted grant');
 assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases WHERE receipt=$1 AND sandbox=true AND refund_hold=false',[session.id])).rows[0].n,1);
 const grants=(await stripe.events.list({type:'checkout.session.completed',limit:100})).data.filter(e=>e.data.object.id===session.id);assert.equal(grants.length,1);
 assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchase_events WHERE event_id=$1',[grants[0].id])).rows[0].n,1);
 result.grant_event=grants[0].id;result.purchase='PASS';
 const refund=await stripe.refunds.create({payment_intent:session.payment_intent},{idempotencyKey:'jamloom-hosted-refund:'+session.id});assert.equal(refund.status,'succeeded');refunded=true;
 await waitFor(async()=>!(await store.access(owner.id,pool,false)),'Hosted refund withdrawal');
 const refunds=(await stripe.events.list({type:'charge.refunded',limit:100})).data.filter(e=>e.data.object.payment_intent===session.payment_intent);assert.equal(refunds.length,1);
 assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchase_events WHERE event_id=$1',[refunds[0].id])).rows[0].n,1);
 assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,before);
 Object.assign(result,{status:'PASS',refund:refund.id,refund_event:refunds[0].id,refund_withdrawal:'PASS',invalid_signatures:'PASS in test and live modes',generation_credit_lot_delta:0,owner_test_entitlement_after:false,live_payment:'NOT RUN',human_learning:'DEFERRED by owner'});
 console.log('Hosted test purchase and refund PASS');
}catch(e){result.status='FAIL';result.error=e.message;throw e;}
finally{
 if(session){const current=await stripe.checkout.sessions.retrieve(session.id);if(current.payment_status==='paid'&&!refunded){const refund=await stripe.refunds.create({payment_intent:current.payment_intent},{idempotencyKey:'jamloom-hosted-refund:'+session.id});result.cleanup_refund={id:refund.id,status:refund.status};}else if(current.status==='open'){await stripe.checkout.sessions.expire(session.id);result.abandoned_checkout='expired';}}
 if(browser)await browser.close();await pool.end();await writeFile(new URL('provider.json',evidence),JSON.stringify(result,null,2)+'\n');
}
