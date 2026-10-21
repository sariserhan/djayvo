// Explicit operations command; never invoked by the normal application build.
import Stripe from 'stripe';import assert from 'node:assert/strict';import{createPublicKey,publicEncrypt}from'node:crypto';
const apply=process.argv.includes('--apply'),activate=process.argv.includes('--activate');assert.ok(!(apply&&activate));
const accountId='acct_1TxA3vDlEXWDEeHO',productKey='academy-complete';
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','charge.refunded','charge.dispute.created','charge.dispute.closed'];
const publicKey=apply?createPublicKey(Buffer.from(process.env.JAMLOOM_BILLING_RECEIPT_PUBLIC_KEY??'','base64')):null;
if(publicKey){assert.equal(publicKey.asymmetricKeyType,'rsa');assert.ok(publicKey.asymmetricKeyDetails.modulusLength>=3072);}
for(const mode of ['test','live']){
 const live=mode==='live',key=process.env[live?'STRIPE_LIVE_SECRET_KEY':'STRIPE_SECRET_KEY'];assert.ok(key?.startsWith('sk_'+mode+'_'),mode+' secret has wrong prefix');
 const stripe=new Stripe(key,{maxNetworkRetries:1,timeout:10000}),account=await stripe.accounts.retrieve();assert.equal(account.id,accountId);
 const url='https://www.jamloom.com/api/academy/stripe?mode='+mode;
 const products=[];for await(const p of stripe.products.list({limit:100}))if(p.metadata.jamloom_product===productKey)products.push(p);assert.ok(products.length<=1,'Duplicate Academy products require review');
 let product=products[0];
 if(!product&&apply)product=await stripe.products.create({name:'Jamloom DJ Academy Complete Pass',description:'One-time access to the Jamloom DJ Academy course and practice studio. Generation credits are not included.',metadata:{jamloom_product:productKey}},{idempotencyKey:'jamloom-academy-catalog-v1-'+mode});
 if(product){assert.equal(product.livemode,live);assert.ok(product.active);}
 const prices=product?(await stripe.prices.list({product:product.id,active:true,limit:100})).data.filter(p=>p.currency==='usd'&&p.unit_amount===7999&&p.type==='one_time'&&p.tax_behavior==='exclusive'):[];
 assert.ok(prices.length<=1,'Duplicate Academy prices require review');let price=prices[0];
 if(product&&!price&&apply)price=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:7999,tax_behavior:'exclusive'},{idempotencyKey:'jamloom-academy-price-v1-'+mode});
 if(price)assert.equal(price.livemode,live);
 const endpoints=[];for await(const w of stripe.webhookEndpoints.list({limit:100}))if(w.url===url)endpoints.push(w);assert.ok(endpoints.length<=1,'Duplicate Academy webhooks require review');let endpoint=endpoints[0],encryptedSecret;
 if(!endpoint&&apply){
  endpoint=await stripe.webhookEndpoints.create({url,enabled_events:events,metadata:{jamloom_product:productKey},description:'Jamloom Academy '+mode+'; sales remain closed'},{idempotencyKey:'jamloom-academy-webhook-v1-'+mode});
  assert.ok(endpoint.secret?.startsWith('whsec_'));
  encryptedSecret=publicEncrypt({key:publicKey,oaepHash:'sha256'},Buffer.from(endpoint.secret)).toString('base64');
  endpoint=await stripe.webhookEndpoints.update(endpoint.id,{disabled:true});
 }
 if(endpoint){assert.equal(endpoint.livemode,live);assert.deepEqual([...endpoint.enabled_events].sort(),[...events].sort());}
 if(activate){
  assert.ok(product&&price&&endpoint);
  const prefix=live?'ACADEMY_STRIPE_LIVE_':'ACADEMY_STRIPE_';assert.equal(process.env[prefix+'PRODUCT_ID'],product.id);assert.equal(process.env[prefix+'PRICE_ID'],price.id);assert.ok(process.env[prefix+'WEBHOOK_SECRET']?.startsWith('whsec_'));
  // Only activate after the deployed URL can verify a signature with this exact secret.
  const payload=JSON.stringify({id:'evt_jamloom_configuration_'+mode,type:'jamloom.configuration.check',livemode:live,data:{object:{}}});
  const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env[prefix+'WEBHOOK_SECRET']});
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});assert.equal(response.status,200,'Deploy billing configuration before enabling webhooks');
  endpoint=await stripe.webhookEndpoints.update(endpoint.id,{disabled:false});
 }
 let tax;try{const t=await stripe.tax.settings.retrieve();tax={status:t.status,default_tax_code:t.defaults?.tax_code,address_country:t.head_office?.address?.country,missing_fields:t.status_details?.pending?.missing_fields};}catch(e){tax={error:e.type,status:e.statusCode};}
 console.log('JAMLOOM_BILLING_RECEIPT '+JSON.stringify({mode,action:activate?'activate':apply?'prepare':'audit',account:account.id,charges_enabled:account.charges_enabled,payouts_enabled:account.payouts_enabled,requirements_due:account.requirements?.currently_due,product:product?.id,price:price?.id,product_tax_code:product?.tax_code,endpoint:endpoint?{id:endpoint.id,url:endpoint.url,status:endpoint.status}:null,encrypted_new_webhook_secret:encryptedSecret,tax,live_charges:0}));
}
