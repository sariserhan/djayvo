import Stripe from 'stripe';import type {Pool,PoolClient} from 'pg';import {createHash} from 'node:crypto';
import {ACADEMY_PRICE_CENTS} from './academy-content';import {AcademyStore} from './academy-store';
export const academyProduct='academy-complete';
export function academyPaymentConfig(env:Record<string,string|undefined>=process.env){
 if(!/^price_[A-Za-z0-9_]+$/.test(env.ACADEMY_STRIPE_PRICE_ID??'')||!/^prod_[A-Za-z0-9_]+$/.test(env.ACADEMY_STRIPE_PRODUCT_ID??''))throw new Error('Academy Stripe product is not configured');
 return {price:env.ACADEMY_STRIPE_PRICE_ID!,product:env.ACADEMY_STRIPE_PRODUCT_ID!};
}
type PaymentConfig={price:string;product:string;live?:boolean};
export async function verifiedAcademyPrice(stripe:Stripe,config:PaymentConfig){
 const price=await stripe.prices.retrieve(config.price,{expand:['product']}),product=price.product;
 if(price.livemode!==!!config.live||!price.active||price.currency!=='usd'||price.unit_amount!==ACADEMY_PRICE_CENTS||price.type!=='one_time'||price.tax_behavior!=='exclusive'||
  typeof product==='string'||product.deleted||product.id!==config.product||!product.active||product.metadata.jamloom_product!==academyProduct)
  throw new Error('Academy price does not match the selected billing catalog');
 return price;
}
export async function academyCheckout(stripe:Stripe,pool:Pool,owner:string,key:string,origin:string,config:PaymentConfig=academyPaymentConfig()){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new Error('Invalid checkout key');
 const url=new URL(origin);if(url.origin!==origin||!['https:','http:'].includes(url.protocol))throw new Error('Invalid checkout origin');
 if(await new AcademyStore(pool).access(owner,pool,!!config.live))throw new Error('Academy pass already active');
 await verifiedAcademyPrice(stripe,config);
 return stripe.checkout.sessions.create({mode:'payment',client_reference_id:owner,metadata:{jamloom_product:academyProduct},
  line_items:[{price:config.price,quantity:1}],automatic_tax:{enabled:true},
  success_url:origin+'/academy/success?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/academy/checkout'},
  {idempotencyKey:'academy:'+owner+':'+key});
}
export async function grantAcademy(stripe:Stripe,pool:Pool,id:string,config:PaymentConfig=academyPaymentConfig(),transaction?:PoolClient){
 const s=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});const line=s.line_items?.data[0];
 if(s.metadata?.jamloom_product!==academyProduct)return false;
 if(s.livemode!==!!config.live||s.mode!=='payment'||s.payment_status!=='paid'||!s.client_reference_id||typeof s.payment_intent!=='string'||
  s.currency!=='usd'||s.amount_subtotal!==7999||s.total_details?.amount_discount!==0||s.line_items?.has_more||s.line_items?.data.length!==1||line?.quantity!==1||
  line.amount_subtotal!==7999||line.price?.id!==config.price||line.price.currency!=='usd'||line.price.unit_amount!==7999||line.price.type!=='one_time'||
  (typeof line.price.product==='string'?line.price.product:line.price.product?.id)!==config.product)throw new Error('Unverified Academy payment');
 const db=transaction??await pool.connect();try{if(!transaction)await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy:'+id]);
  const hold=(await db.query('SELECT * FROM academy_purchase_holds WHERE receipt=$1',[id])).rows[0];
  await db.query(`INSERT INTO academy_purchases(receipt,owner_id,product_key,price_id,payment_intent,amount_cents,currency,sandbox,refund_hold,dispute_hold)
   VALUES($1,$2,'academy-complete',$3,$4,7999,'usd',$7,$5,$6) ON CONFLICT(receipt) DO NOTHING`,[id,s.client_reference_id,config.price,s.payment_intent,!!hold?.refund_hold,!!hold?.dispute_hold,!config.live]);
  const prior=(await db.query('SELECT * FROM academy_purchases WHERE receipt=$1',[id])).rows[0];
  if(prior.sandbox===!!config.live||prior.owner_id!==s.client_reference_id||prior.price_id!==config.price||prior.payment_intent!==s.payment_intent)throw new Error('Academy receipt conflict');
  if(!transaction)await db.query('COMMIT');return true;
 }catch(e){if(!transaction)await db.query('ROLLBACK');throw e;}finally{if(!transaction)db.release();}
}
export async function academyHold(pool:Pool,receipt:string,kind:'refund'|'dispute',held=true,transaction?:PoolClient){
 if(!/^cs_[A-Za-z0-9_]+$/.test(receipt)||!['refund','dispute'].includes(kind)||kind==='refund'&&!held)throw new Error('Invalid Academy reversal');
 const column=kind==='refund'?'refund_hold':'dispute_hold',db=transaction??await pool.connect();
 try{if(!transaction)await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy:'+receipt]);
  await db.query(`INSERT INTO academy_purchase_holds(receipt,${column}) VALUES($1,$2) ON CONFLICT(receipt) DO UPDATE SET ${column}=$2,updated_at=now()`,[receipt,held]);
  await db.query(`UPDATE academy_purchases SET ${column}=$2 WHERE receipt=$1`,[receipt,held]);if(!transaction)await db.query('COMMIT');
 }catch(e){if(!transaction)await db.query('ROLLBACK');throw e;}finally{if(!transaction)db.release();}
}
export async function academyWebhook(stripe:Stripe,pool:Pool,event:Stripe.Event,raw:string,config:PaymentConfig=academyPaymentConfig()){
 if(event.livemode!==!!config.live)throw new Error('Billing environment mismatch');
 const digest=createHash('sha256').update(raw).digest('hex');
 // Serialize duplicate/conflicting deliveries across restarts; grants/reversals also lock receipts.
 const lock=await pool.connect();
 try{await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy-event:'+event.id]);
  const prior=(await lock.query('SELECT digest FROM academy_purchase_events WHERE event_id=$1',[event.id])).rows[0];
  if(prior){if(prior.digest!==digest)throw new Error('Webhook replay conflict');await lock.query('COMMIT');return;}
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   if(event.data.object.metadata?.jamloom_product===academyProduct&&event.data.object.payment_status==='paid')await grantAcademy(stripe,pool,event.data.object.id,config,lock);
  }else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'||event.type==='charge.dispute.closed'){
   const intent=event.data.object.payment_intent;if(typeof intent!=='string')throw new Error('Missing payment intent');
   const sessions=await stripe.checkout.sessions.list({payment_intent:intent,limit:2});
   if(sessions.has_more||sessions.data.length!==1)throw new Error('Ambiguous reversal');
   if(sessions.data[0].metadata?.jamloom_product===academyProduct){
    if(event.type==='charge.refunded')await academyHold(pool,sessions.data[0].id,'refund',true,lock);
    else{await lock.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy:'+sessions.data[0].id]);const dispute=await stripe.disputes.retrieve(event.data.object.id);if(dispute.livemode!==!!config.live||dispute.payment_intent!==intent)throw new Error('Dispute mismatch');
     await academyHold(pool,sessions.data[0].id,'dispute',dispute.status!=='won',lock);}
   }
  }
  await lock.query('INSERT INTO academy_purchase_events(event_id,digest) VALUES($1,$2)',[event.id,digest]);await lock.query('COMMIT');
 }catch(e){await lock.query('ROLLBACK');throw e;}finally{lock.release();}
}
