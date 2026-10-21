import test from 'node:test';
import assert from 'node:assert/strict';
import { netProceeds,quoteCost,privacyCredits,COST_CATEGORIES,type Costs } from '../lib/economics';
import { paidGenerationReleased } from '../lib/product';
import { sandboxStripe,fulfillCheckout } from '../lib/stripe-payments';
import Stripe from 'stripe';
test('tax, Apple fee tier, fixed fees, refunds, FX and overhead reduce spendable proceeds',()=>{
 const net=netProceeds(9_990_000,{tax:1_665_000,provider:2_997_000,refundRisk:500_000,overhead:400_000,discount:300_000,fx:200_000});
 assert.equal(net,3_928_000);
 for(const cost of [1,100000,600000,2000000])for(const margin of [3000,5000]){
  const costs=Object.fromEntries(COST_CATEGORIES.map(k=>[k,k==='gpu'?cost:1000])) as Costs;
  const q=quoteCost(costs,Math.floor(net/10),margin);
  assert.ok(BigInt(q.credits)*BigInt(Math.floor(net/10))*BigInt(10000-margin)>=BigInt(q.costCapMicros)*10000n);
 }
 assert.throws(()=>quoteCost({gpu:5} as Costs,100));
 assert.throws(()=>quoteCost(Object.fromEntries(COST_CATEGORIES.map(k=>[k,1])) as Costs,10,2999));
 assert.throws(()=>netProceeds(100,{tax:100,provider:1,refundRisk:0,overhead:0,discount:0,fx:0}));
 assert.equal(paidGenerationReleased,false);
});
test('Stripe signatures require exact body, timestamp and sandbox credentials',()=>{
 const stripe=new Stripe('sk_test_fixture');const secret='whsec_fixture',payload=JSON.stringify({id:'evt_test',livemode:false});
 const header=stripe.webhooks.generateTestHeaderString({payload,secret});
 assert.equal(stripe.webhooks.constructEvent(payload,header,secret).id,'evt_test');
 assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',header,secret));
 assert.throws(()=>stripe.webhooks.constructEvent(payload,stripe.webhooks.generateTestHeaderString({payload,secret,timestamp:1}),secret));
 assert.throws(()=>sandboxStripe({STRIPE_SECRET_KEY:'sk_live_never',STRIPE_WEBHOOK_SECRET:secret}));
});
test('Checkout fulfillment rereads paid state, rejects unpaid, wrong totals and live payments',async()=>{
 const session={id:'cs_test',metadata:{pack:'starter'},client_reference_id:'owner',livemode:false,mode:'payment',payment_status:'paid',payment_intent:'pi_test',currency:'usd',amount_subtotal:999,amount_total:1099,total_details:{amount_discount:0,amount_tax:100},line_items:{data:[{quantity:1,amount_subtotal:999}]}};
 const charge={id:'ch_test',livemode:false,paid:true,captured:true,refunded:false,amount_refunded:0,disputed:false,currency:'usd',amount:1099,payment_intent:'pi_test',balance_transaction:{currency:'usd',source:'ch_test',amount:1099,net:1037,fee:62,exchange_rate:null}};
 const intent={id:'pi_test',livemode:false,status:'succeeded',latest_charge:charge};
 let granted=0;const wallet={grant:async(_owner:string,p:{netMicros:number})=>{assert.equal(p.netMicros,7370000);granted++;}};
 const stripe={checkout:{sessions:{retrieve:async()=>session}},paymentIntents:{retrieve:async()=>intent}};
 await fulfillCheckout(stripe as unknown as Stripe,wallet as never,'cs_test');assert.equal(granted,1);
 for(const patch of [{payment_status:'unpaid'},{livemode:true},{amount_subtotal:1},{currency:'eur'},{client_reference_id:null}]){
  const bad={checkout:{sessions:{retrieve:async()=>({...session,...patch})}}};
  await assert.rejects(fulfillCheckout(bad as unknown as Stripe,wallet as never,'cs_test'));
 }
 assert.equal(granted,1);
 for(const changed of [{balance_transaction:null},{amount_refunded:1},{disputed:true},{balance_transaction:{...charge.balance_transaction,fee:NaN}},{balance_transaction:{...charge.balance_transaction,currency:'eur'}},{balance_transaction:{...charge.balance_transaction,source:'ch_other'}}])
  await assert.rejects(fulfillCheckout({...stripe,paymentIntents:{retrieve:async()=>({...intent,latest_charge:{...charge,...changed}})}} as unknown as Stripe,wallet as never,'cs_test'));
 assert.equal(granted,1);
});

test('private credits are 25 percent of the base rounded up, bounded and integer',()=>{
 for(const [base,extra] of [[0,0],[1,1],[4,1],[5,2],[100000,25000]])assert.equal(privacyCredits(base),extra);
 for(const n of [-1,1.1,NaN,Infinity,100001])assert.throws(()=>privacyCredits(n));
});
