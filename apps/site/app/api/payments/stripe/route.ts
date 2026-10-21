import { createHash } from 'node:crypto';
import { services,accountsConfigured } from '../../../../lib/services';
import { sandboxStripe,fulfillCheckout } from '../../../../lib/stripe-payments';
import { Wallet } from '../../../../lib/wallet';
import { boundedAuthRequest } from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!accountsConfigured())return Response.json({error:'Payment service unavailable'},{status:503});
  let stripe;try{stripe=sandboxStripe();}catch{return Response.json({error:'Sandbox not configured'},{status:503});}
  const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
  const raw=await bounded.text();let event;
  try{event=stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature')??'',process.env.STRIPE_WEBHOOK_SECRET!);}
  catch{return Response.json({error:'Invalid signature'},{status:400});}
  if(event.livemode)return Response.json({error:'Live billing is not released'},{status:403});
  try{
    const {pool}=services(),wallet=new Wallet(pool),hash=createHash('sha256').update(raw).digest('hex');
    const old=(await pool.query("SELECT digest FROM provider_webhook_events WHERE provider='stripe_test' AND event_id=$1",[event.id])).rows[0];
    if(old){if(old.digest!==hash)throw new Error('Webhook conflict');return Response.json({received:true});}
    if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
      if(event.data.object.payment_status==='paid'&&event.data.object.metadata?.jamloom_product!=='academy-complete')await fulfillCheckout(stripe,wallet,event.data.object.id);
    }else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
      const object=event.data.object;const intent=object.payment_intent;
      if(typeof intent!=='string')throw new Error('Missing payment intent');
      const sessions=await stripe.checkout.sessions.list({payment_intent:intent,limit:1});
      if(!sessions.data.length)throw new Error('Unknown payment');
      if(sessions.data[0].metadata?.jamloom_product!=='academy-complete')await wallet.freezePurchase('stripe_test',sessions.data[0].id);
    }
    await pool.query("INSERT INTO provider_webhook_events(provider,event_id,digest) VALUES('stripe_test',$1,$2) ON CONFLICT DO NOTHING",[event.id,hash]);
    return Response.json({received:true});
  }catch{return Response.json({error:'Payment reconciliation pending; retry delivery'},{status:503});}
}
