import Stripe from 'stripe';import type {Pool,PoolClient} from 'pg';import {createHash} from 'node:crypto';
import {proAccess} from './pro-access';
const PRO_PRICE_CENTS=4900;
export const proProduct='jamloom-pro-v1';
export function proPaymentConfig(env:Record<string,string|undefined>=process.env){
 if(!/^price_[A-Za-z0-9_]+$/.test(env.PRO_STRIPE_PRICE_ID??'')||!/^prod_[A-Za-z0-9_]+$/.test(env.PRO_STRIPE_PRODUCT_ID??''))throw new Error('Pro Stripe product is not configured');
 return {price:env.PRO_STRIPE_PRICE_ID!,product:env.PRO_STRIPE_PRODUCT_ID!};
}
type PaymentConfig={price:string;product:string;live?:boolean};
export async function verifiedProPrice(stripe:Stripe,config:PaymentConfig){
 const price=await stripe.prices.retrieve(config.price,{expand:['product']}),product=price.product;
 if(price.livemode!==!!config.live||!price.active||price.currency!=='usd'||price.unit_amount!==PRO_PRICE_CENTS||price.type!=='one_time'||price.tax_behavior!=='exclusive'||
  typeof product==='string'||product.deleted||product.id!==config.product||!product.active||product.metadata.jamloom_product!==proProduct)
  throw new Error('Pro price does not match the selected billing catalog');
 return price;
}
export async function proCheckout(stripe:Stripe,pool:Pool,owner:string,key:string,origin:string,config:PaymentConfig=proPaymentConfig()){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new Error('Invalid checkout key');
 const url=new URL(origin);if(url.origin!==origin||!['https:','http:'].includes(url.protocol))throw new Error('Invalid checkout origin');
 if(await proAccess(pool,owner,!!config.live))throw new Error('Pro pass already active');
 await verifiedProPrice(stripe,config);
 return stripe.checkout.sessions.create({mode:'payment',client_reference_id:owner,metadata:{jamloom_product:proProduct},
  line_items:[{price:config.price,quantity:1}],automatic_tax:{enabled:true},
  success_url:origin+'/pro?payment=complete',cancel_url:origin+'/pro?payment=cancelled'},
  {idempotencyKey:'pro:inline:'+owner+':'+key});
}
export async function grantPro(stripe:Stripe,pool:Pool,id:string,config:PaymentConfig=proPaymentConfig(),transaction?:PoolClient){
 const s=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});const line=s.line_items?.data[0];
 if(s.metadata?.jamloom_product!==proProduct)return false;
 if(s.livemode!==!!config.live||s.mode!=='payment'||s.payment_status!=='paid'||!s.client_reference_id||typeof s.payment_intent!=='string'||
  s.currency!=='usd'||s.amount_subtotal!==4900||s.total_details?.amount_discount!==0||s.line_items?.has_more||s.line_items?.data.length!==1||line?.quantity!==1||
  line.amount_subtotal!==4900||line.price?.id!==config.price||line.price.currency!=='usd'||line.price.unit_amount!==4900||line.price.type!=='one_time'||
  (typeof line.price.product==='string'?line.price.product:line.price.product?.id)!==config.product)throw new Error('Unverified Pro payment');
 const intent=await stripe.paymentIntents.retrieve(s.payment_intent,{expand:['latest_charge']});const charge=intent.latest_charge;
 if(charge&&typeof charge!=='string'&&(charge.refunded||charge.amount_refunded>0||charge.disputed)){await proHold(pool,id,charge.disputed?'dispute':'refund',true,transaction);return false;}
 if(intent.livemode!==!!config.live||intent.status!=='succeeded'||!charge||typeof charge==='string'||!charge.paid||!charge.captured||charge.livemode!==!!config.live||charge.payment_intent!==intent.id||charge.refunded||charge.amount_refunded!==0||charge.disputed||charge.amount!==s.amount_total||charge.currency!=='usd')throw Error('Pro charge is not eligible');
 const db=transaction??await pool.connect();try{if(!transaction)await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['pro:'+id]);
  const hold=(await db.query('SELECT * FROM pro_purchase_holds WHERE receipt=$1',[id])).rows[0];
  await db.query(`INSERT INTO pro_purchases(receipt,owner_id,product_key,price_id,payment_intent,amount_cents,currency,sandbox,refund_hold,dispute_hold)
   VALUES($1,$2,'jamloom-pro-v1',$3,$4,4900,'usd',$7,$5,$6) ON CONFLICT(receipt) DO NOTHING`,[id,s.client_reference_id,config.price,s.payment_intent,!!hold?.refund_hold,!!hold?.dispute_hold,!config.live]);
  const prior=(await db.query('SELECT * FROM pro_purchases WHERE receipt=$1',[id])).rows[0];
  if(prior.sandbox===!!config.live||prior.owner_id!==s.client_reference_id||prior.price_id!==config.price||prior.payment_intent!==s.payment_intent)throw new Error('Pro receipt conflict');
  if(!transaction)await db.query('COMMIT');return true;
 }catch(e){if(!transaction)await db.query('ROLLBACK');throw e;}finally{if(!transaction)db.release();}
}
export async function proHold(pool:Pool,receipt:string,kind:'refund'|'dispute',held=true,transaction?:PoolClient){
 if(!/^cs_[A-Za-z0-9_]+$/.test(receipt)||!['refund','dispute'].includes(kind)||kind==='refund'&&!held)throw new Error('Invalid Pro reversal');
 const column=kind==='refund'?'refund_hold':'dispute_hold',db=transaction??await pool.connect();
 try{if(!transaction)await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['pro:'+receipt]);
  await db.query(`INSERT INTO pro_purchase_holds(receipt,${column}) VALUES($1,$2) ON CONFLICT(receipt) DO UPDATE SET ${column}=$2,updated_at=now()`,[receipt,held]);
  await db.query(`UPDATE pro_purchases SET ${column}=$2 WHERE receipt=$1`,[receipt,held]);if(!transaction)await db.query('COMMIT');
 }catch(e){if(!transaction)await db.query('ROLLBACK');throw e;}finally{if(!transaction)db.release();}
}
export async function proWebhook(stripe:Stripe,pool:Pool,event:Stripe.Event,raw:string,config:PaymentConfig=proPaymentConfig()){
 if(event.livemode!==!!config.live)throw new Error('Billing environment mismatch');
 const digest=createHash('sha256').update(raw).digest('hex');
 // Serialize duplicate/conflicting deliveries across restarts; grants/reversals also lock receipts.
 const lock=await pool.connect();
 try{await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['pro-event:'+event.id]);
  const prior=(await lock.query('SELECT digest FROM pro_purchase_events WHERE event_id=$1',[event.id])).rows[0];
  if(prior){if(prior.digest!==digest)throw new Error('Webhook replay conflict');await lock.query('COMMIT');return;}
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   if(event.data.object.metadata?.jamloom_product===proProduct&&event.data.object.payment_status==='paid')await grantPro(stripe,pool,event.data.object.id,config,lock);
  }else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'||event.type==='charge.dispute.closed'){
   const intent=event.data.object.payment_intent;
   // Legacy direct charges have no PaymentIntent and cannot be Pro Checkout purchases.
   if(intent!==null){if(typeof intent!=='string')throw new Error('Missing payment intent');
   const sessions=await stripe.checkout.sessions.list({payment_intent:intent,limit:2});
   if(sessions.has_more||sessions.data.length>1)throw new Error('Ambiguous reversal');
   if(sessions.data[0]?.metadata?.jamloom_product===proProduct){
    if(event.type==='charge.refunded')await proHold(pool,sessions.data[0].id,'refund',true,lock);
    else{await lock.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['pro:'+sessions.data[0].id]);const dispute=await stripe.disputes.retrieve(event.data.object.id);if(dispute.livemode!==!!config.live||dispute.payment_intent!==intent)throw new Error('Dispute mismatch');
     await proHold(pool,sessions.data[0].id,'dispute',dispute.status!=='won',lock);}
   }
   }
  }
  await lock.query('INSERT INTO pro_purchase_events(event_id,digest) VALUES($1,$2)',[event.id,digest]);await lock.query('COMMIT');
 }catch(e){await lock.query('ROLLBACK');throw e;}finally{lock.release();}
}
