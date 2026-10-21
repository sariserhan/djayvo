import {services,accountsConfigured} from '../../../../lib/services';import {academyStripe} from '../../../../lib/billing-mode';
import {academyWebhook} from '../../../../lib/academy-payments';import {readBody} from '../../../../lib/audio-validation';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return Response.json({error:'Academy payment service unavailable'},{status:503});
 const mode=new URL(request.url).searchParams.get('mode')??'test';if(mode!=='test'&&mode!=='live')return new Response(null,{status:400});
 let stripe,config,secret;try{({stripe,config,secret}=academyStripe(mode));}catch{return Response.json({error:'Selected billing environment not configured'},{status:503});}
 let raw;try{raw=(await readBody(request.body,65536)).toString();}catch{return new Response(null,{status:413});}
 let event;try{event=stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature')??'',secret);}catch{return Response.json({error:'Invalid signature'},{status:400});}
 if(event.livemode!==(mode==='live'))return Response.json({error:'Billing environment mismatch'},{status:403});
 try{await academyWebhook(stripe,services().pool,event,raw,config);return Response.json({received:true});}
 catch{return Response.json({error:'Academy reconciliation pending; retry delivery'},{status:503});}
}
