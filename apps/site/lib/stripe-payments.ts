import Stripe from 'stripe';
import { CREDIT_PACKS, integer } from './economics';
import { Wallet } from './wallet';

export function sandboxStripe(env:Record<string,string|undefined>=process.env){
  if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('Stripe sandbox not configured');
  return new Stripe(env.STRIPE_SECRET_KEY,{maxNetworkRetries:1,timeout:10000});
}
export async function fulfillCheckout(stripe:Stripe,wallet:Wallet,id:string){
  // Re-read authoritative payment state; browser redirect and event metadata never mint credits.
  const session=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});
  const packKey=session.metadata?.pack as keyof typeof CREDIT_PACKS,pack=CREDIT_PACKS[packKey];
  const owner=session.client_reference_id;
  if(session.livemode||session.mode!=='payment'||session.payment_status!=='paid'||!owner||!pack||
     session.currency!=='usd'||session.amount_subtotal!==pack.cents||session.total_details?.amount_discount!==0||
     session.line_items?.data.length!==1||session.line_items.data[0].quantity!==1||
     session.line_items.data[0].amount_subtotal!==pack.cents)throw new Error('Unsupported or unpaid purchase');
  if(typeof session.payment_intent!=='string')throw new Error('Missing payment intent');
  const intent=await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge.balance_transaction']});
  const charge=intent.latest_charge;
  if(intent.livemode||intent.status!=='succeeded'||!charge||typeof charge==='string'||charge.livemode||
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
  return wallet.grant(owner,{provider:'stripe_test',receipt:session.id,credits:pack.credits,netMicros});
}
export async function checkout(stripe:Stripe,owner:string,pack:keyof typeof CREDIT_PACKS,key:string,origin:string){
  if(!CREDIT_PACKS[pack]||!/^https?:\/\//.test(origin)||!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new Error('Invalid checkout');
  const p=CREDIT_PACKS[pack];
  return stripe.checkout.sessions.create({mode:'payment',client_reference_id:owner,metadata:{pack},
    line_items:[{price_data:{currency:'usd',unit_amount:p.cents,product_data:{name:`Jamloom ${p.credits} test credits`}},quantity:1}],
    ui_mode:'embedded_page',redirect_on_completion:'never',
    automatic_tax:{enabled:true}}, {idempotencyKey:`jamloom:inline:${owner}:${key}`});
}
