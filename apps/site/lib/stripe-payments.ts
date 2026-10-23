import Stripe from 'stripe';
import { CREDIT_PACKS, integer } from './economics';
import { Wallet } from './wallet';

export function sandboxStripe(env:Record<string,string|undefined>=process.env){
  if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('Stripe sandbox not configured');
  return new Stripe(env.STRIPE_SECRET_KEY,{maxNetworkRetries:1,timeout:10000});
}
export function creditBilling(env:Record<string,string|undefined>=process.env){
 const mode=env.CREDIT_BILLING_MODE??'test';if(!['test','live'].includes(mode))throw Error('Invalid credit billing mode');
 const live=mode==='live',key=live?env.STRIPE_LIVE_SECRET_KEY:env.STRIPE_SECRET_KEY;
 const secret=live?env.CREDIT_STRIPE_LIVE_WEBHOOK_SECRET:env.STRIPE_WEBHOOK_SECRET;
 if(!key?.startsWith(live?'sk_live_':'sk_test_')||!secret?.startsWith('whsec_'))throw Error('Credit billing is not configured');
 return {stripe:new Stripe(key,{maxNetworkRetries:1,timeout:10000}),secret,live,enabled:env.JAMLOOM_CREDIT_PURCHASES_ENABLED==='true'&&/^txcd_[0-9]{8}$/.test(env.CREDIT_STRIPE_TAX_CODE??'')};
}
export async function fulfillCheckout(stripe:Stripe,wallet:Wallet,id:string){
  // Re-read authoritative payment state; browser redirect and event metadata never mint credits.
  const session=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});
  const packKey=session.metadata?.pack as keyof typeof CREDIT_PACKS,pack=CREDIT_PACKS[packKey];
  const owner=session.client_reference_id;
  if(session.livemode!==wallet.live||session.metadata?.jamloom_product!=='song-credits'||session.mode!=='payment'||session.payment_status!=='paid'||!owner||!pack||
     session.currency!=='usd'||session.amount_subtotal!==pack.cents||session.total_details?.amount_discount!==0||
     session.line_items?.has_more||session.line_items?.data.length!==1||session.line_items.data[0].quantity!==1||
     session.line_items.data[0].amount_subtotal!==pack.cents)throw new Error('Unsupported or unpaid purchase');
  if(typeof session.payment_intent!=='string')throw new Error('Missing payment intent');
  const intent=await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge.balance_transaction']});
  const charge=intent.latest_charge;
  if(intent.livemode!==wallet.live||intent.status!=='succeeded'||!charge||typeof charge==='string'||charge.livemode!==wallet.live||
    !charge.paid||!charge.captured||charge.refunded||charge.amount_refunded!==0||charge.disputed||
    charge.currency!=='usd'||charge.amount!==session.amount_total||charge.payment_intent!==intent.id)
    throw new Error('Payment charge is not eligible');
  const balance=charge.balance_transaction,tax=session.total_details?.amount_tax;
  if(!balance||typeof balance==='string'||balance.currency!=='usd'||balance.source!==charge.id||
    balance.amount!==charge.amount||balance.net!==balance.amount-balance.fee||balance.exchange_rate!==null)
    throw new Error('Payment fee evidence pending or unsupported');
  integer(balance.amount,1);integer(balance.fee);integer(tax!,0,balance.amount);
  // Sandbox support/refund reserves remain provisional; never substitute guessed processor fees.
  const reserve=Math.ceil(pack.cents*.2);
  const netMicros=(balance.net-tax!-reserve)*10000;
  integer(netMicros,pack.credits);
  return wallet.grant(owner,{provider:wallet.live?'stripe_live':'stripe_test',receipt:session.id,credits:pack.credits,netMicros});
}
export async function checkout(stripe:Stripe,owner:string,pack:keyof typeof CREDIT_PACKS,key:string,origin:string,live=false,taxCode=process.env.CREDIT_STRIPE_TAX_CODE){
  if(!CREDIT_PACKS[pack]||!/^https?:\/\//.test(origin)||!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new Error('Invalid checkout');
  if(!/^txcd_[0-9]{8}$/.test(taxCode??''))throw Error('Credit tax category is not configured');
  const p=CREDIT_PACKS[pack];
  return stripe.checkout.sessions.create({mode:'payment',client_reference_id:owner,metadata:{pack,jamloom_product:'song-credits'},
    line_items:[{price_data:{currency:'usd',tax_behavior:'exclusive',unit_amount:p.cents,product_data:{tax_code:taxCode,name:`Jamloom ${p.credits} ${live?'':'test '}credits`}},quantity:1}],
    success_url:origin+'/account/credits?payment=complete&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/account/credits?payment=cancelled',
    automatic_tax:{enabled:true}}, {idempotencyKey:`jamloom:inline:${owner}:${key}`});
}
