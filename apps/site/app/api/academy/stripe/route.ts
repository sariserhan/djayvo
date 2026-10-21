import {services,accountsConfigured} from '../../../../lib/services';import {sandboxStripe} from '../../../../lib/stripe-payments';
import {academyWebhook,academyPaymentConfig} from '../../../../lib/academy-payments';import {readBody} from '../../../../lib/audio-validation';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return Response.json({error:'Academy payment service unavailable'},{status:503});
 let stripe,config;try{stripe=sandboxStripe({...process.env,STRIPE_WEBHOOK_SECRET:process.env.ACADEMY_STRIPE_WEBHOOK_SECRET});config=academyPaymentConfig();}catch{return Response.json({error:'Academy sandbox not configured'},{status:503});}
 let raw;try{raw=(await readBody(request.body,65536)).toString();}catch{return new Response(null,{status:413});}
 let event;try{event=stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature')??'',process.env.ACADEMY_STRIPE_WEBHOOK_SECRET!);}catch{return Response.json({error:'Invalid signature'},{status:400});}
 if(event.livemode)return Response.json({error:'Live billing is not released'},{status:403});
 try{await academyWebhook(stripe,services().pool,event,raw,config);return Response.json({received:true});}
 catch{return Response.json({error:'Academy reconciliation pending; retry delivery'},{status:503});}
}
