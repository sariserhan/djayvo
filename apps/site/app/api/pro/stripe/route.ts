import {services,accountsConfigured} from '../../../../lib/services';
import {proBilling} from '../../../../lib/pro-billing';
import {proWebhook} from '../../../../lib/pro-payments';
import {readBody} from '../../../../lib/audio-validation';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return new Response(null,{status:503});
 let billing;try{billing=proBilling(process.env,new URL(request.url).searchParams.get('mode')??'test');}catch{return new Response(null,{status:503});}
 let raw;try{raw=(await readBody(request.body,65536)).toString();}catch{return new Response(null,{status:413});}
 let event;try{event=billing.stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature')??'',billing.secret);}catch{return new Response(null,{status:400});}
 if(event.livemode!==billing.config.live)return new Response(null,{status:403});
 try{await proWebhook(billing.stripe,services().pool,event,raw,billing.config);return Response.json({received:true});}catch{return new Response(null,{status:503});}
}
