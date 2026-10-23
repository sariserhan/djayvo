import './env';
import Stripe from 'stripe';
import assert from 'node:assert/strict';
import {open,writeFile} from 'node:fs/promises';

const apply=process.argv.includes('--apply'),key=process.env.STRIPE_LIVE_SECRET_KEY;
assert(key&&key.startsWith('sk_live_'),'Live Stripe key is required');
const stripe=new Stripe(key,{maxNetworkRetries:1,timeout:10000});
const account=await stripe.accounts.retrieve('acct_1TxA3vDlEXWDEeHO');assert.equal(account.id,'acct_1TxA3vDlEXWDEeHO');
const url='https://www.jamloom.com/api/payments/stripe';
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','charge.refunded','charge.dispute.created','charge.dispute.closed'] as const;
const endpoints=[];for await(const item of stripe.webhookEndpoints.list({limit:100}))if(item.url===url)endpoints.push(item);
assert(endpoints.length<=1,'Duplicate song-credit endpoints need review');let endpoint=endpoints[0];
if(!endpoint&&apply){
 // A newly issued secret is returned only at creation; open its private receipt first.
 const file=await open('../../build-song-finish/song-webhook.env','wx',0o600);
 try{
  endpoint=await stripe.webhookEndpoints.create({url,enabled_events:[...events],metadata:{jamloom_product:'song-credits'},description:'Jamloom song credits; disabled until owner website release'},{idempotencyKey:'jamloom-song-credits-webhook-v1'});
  assert(endpoint.secret?.startsWith('whsec_'));await file.writeFile('CREDIT_STRIPE_LIVE_WEBHOOK_SECRET='+endpoint.secret+'\n');await file.sync();
 }finally{await file.close();if(endpoint)endpoint=await stripe.webhookEndpoints.update(endpoint.id,{disabled:true});}
}
if(endpoint){assert(endpoint.livemode);assert.deepEqual([...endpoint.enabled_events].sort(),[...events].sort());assert.equal(endpoint.status,'disabled','Do not alter an already active billing endpoint');}
const report={status:endpoint?'PASS':'PREPARED',account:account.id,chargesEnabled:account.charges_enabled,endpoint:endpoint?{id:endpoint.id,url:endpoint.url,status:endpoint.status}:null,taxCode:process.env.CREDIT_STRIPE_TAX_CODE,liveCharges:0,websiteDeployed:false};
if(apply)await writeFile('../../docs/evidence/song-finish/billing-preparation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
