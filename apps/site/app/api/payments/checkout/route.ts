import {services} from '../../../../lib/services';
import {creditBilling,checkout,fulfillCheckout} from '../../../../lib/stripe-payments';
import {Wallet} from '../../../../lib/wallet';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
import {CREDIT_PACKS} from '../../../../lib/economics';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const {auth,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
  const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return Response.json({error:'Sign in with a verified account first.'},{status:401});
  const billing=creditBilling();if(!billing.enabled)return Response.json({error:'Credit purchases are not open yet.'},{status:503});
  const bounded=await boundedAuthRequest(request,4096);if(!bounded)return new Response(null,{status:413});
  const body=await bounded.json();if(!body||!Object.hasOwn(CREDIT_PACKS,body.pack)||typeof body.key!=='string')return Response.json({error:'Choose a credit pack.'},{status:400});
  const result=await checkout(billing.stripe,session.user.id,body.pack,body.key,config.baseURL,billing.live);
  const url=new URL(result.url??'');if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Invalid checkout URL');
  return Response.json({url:url.href,sessionId:result.id},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Checkout is temporarily unavailable. Please try again.'},{status:503});}
}
export async function GET(request:Request){
 try{
  const {auth,pool}=services(),session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return new Response(null,{status:401});
  const id=new URL(request.url).searchParams.get('session_id');if(!/^cs_[A-Za-z0-9_]+$/.test(id??''))return new Response(null,{status:400});
  const {stripe,live}=creditBilling(),purchase=await stripe.checkout.sessions.retrieve(id!);
  if(purchase.client_reference_id!==session.user.id||purchase.metadata?.jamloom_product!=='song-credits')return new Response(null,{status:404});
  if(purchase.payment_status!=='paid')return Response.json({pending:true});
  const wallet=new Wallet(pool,live);await fulfillCheckout(stripe,wallet,id!);
  return Response.json({complete:true,balance:await wallet.balance(session.user.id)},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({pending:true},{status:202,headers:{'Cache-Control':'private, no-store'}});}
}
