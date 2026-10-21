import test from 'node:test';import assert from 'node:assert/strict';import type Stripe from 'stripe';
import {aurowallObject,audioRange} from '../lib/aurowall';import {checkout} from '../lib/stripe-payments';import {billingPublishableKey,billingReadiness} from '../lib/billing-mode';
test('partner catalogue accepts bounded music only, with opaque stable IDs',()=>{
 const a=aurowallObject({Key:'house/house.mp3',Size:1024,ETag:'abc'});assert.ok(a);assert.equal(a.title,'House');assert.match(a.url,/^\/api\/aurowall\/[a-f0-9]{24}$/);assert.equal(a.id,aurowallObject({Key:'house/house.mp3',Size:2048})?.id);
 for(const key of ['house/index.json','private/user/voice.mp3','../secret.mp3','house/../../voice.mp3','house/track.html','house/track.wav'])assert.equal(aurowallObject({Key:key,Size:1}),null);
 for(const size of [0,-1,NaN,1.2,100*1024*1024+1])assert.equal(aurowallObject({Key:'house/house.mp3',Size:size}),null);
});
test('audio ranges support seeking and suffix reads, rejecting invalid and multiple ranges',()=>{
 assert.equal(audioRange(null,100),undefined);assert.equal(audioRange('bytes=10-20',100),'bytes=10-20');assert.equal(audioRange('bytes=90-',100),'bytes=90-99');assert.equal(audioRange('bytes=-10',100),'bytes=90-99');assert.equal(audioRange('bytes=0-999',100),'bytes=0-99');
 for(const value of ['bytes=100-','bytes=20-10','bytes=-0','bytes=-','bytes=0-1,5-6','items=0-1','bytes=9007199254740992-'])assert.throws(()=>audioRange(value,100));
});
test('all web Checkout factories stay inline with stable idempotency and server prices',async()=>{
 let body:any,options:any;const stripe={checkout:{sessions:{create:async(b:any,o:any)=>{body=b;options=o;return {};}}}} as unknown as Stripe;
 await checkout(stripe,'owner','starter','retry_key','https://www.jamloom.com');assert.equal(body.ui_mode,'embedded_page');assert.equal(body.redirect_on_completion,'never');assert.equal(body.success_url,undefined);assert.equal(body.cancel_url,undefined);assert.equal(body.automatic_tax.enabled,true);assert.match(options.idempotencyKey,/inline:owner:retry_key$/);
});
test('publishable keys must match billing mode; secrets alone cannot open inline checkout',()=>{
 assert.equal(billingPublishableKey('test',{STRIPE_PUBLISHABLE_KEY:'pk_live_wrong'}),null);assert.equal(billingPublishableKey('live',{STRIPE_LIVE_PUBLISHABLE_KEY:'sk_live_wrong'}),null);
 const env={STRIPE_SECRET_KEY:'sk_test_fixture',ACADEMY_STRIPE_WEBHOOK_SECRET:'whsec_fixture',ACADEMY_STRIPE_PRICE_ID:'price_fixture',ACADEMY_STRIPE_PRODUCT_ID:'prod_fixture',ACADEMY_STRIPE_SANDBOX_ENABLED:'true'};
 assert.equal(billingReadiness('test',env).academyCheckoutEnabled,false);assert.equal(billingReadiness('test',{...env,STRIPE_PUBLISHABLE_KEY:'pk_test_fixture'}).academyCheckoutEnabled,true);assert.equal(billingReadiness('live',env).academyCheckoutEnabled,false);
});
