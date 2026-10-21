import {services,accountsConfigured} from '../../../../lib/services';import {sandboxStripe} from '../../../../lib/stripe-payments';import {academyCheckout} from '../../../../lib/academy-payments';import {boundedAuthRequest} from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
 if(process.env.ACADEMY_STRIPE_SANDBOX_ENABLED!=='true'||!accountsConfigured())return Response.json({error:'Academy purchases are not open. The introduction remains free.'},{status:503});
 const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return new Response(null,{status:401});
 const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
 try{const data=await bounded.json();if(typeof data.key!=='string'||Object.keys(data).length!==1)throw new Error('Invalid request');
  const stripe=sandboxStripe({...process.env,STRIPE_WEBHOOK_SECRET:process.env.ACADEMY_STRIPE_WEBHOOK_SECRET});
  const result=await academyCheckout(stripe,pool,session.user.id,data.key,config.baseURL);
  if(!result.url||new URL(result.url).origin!=='https://checkout.stripe.com')throw new Error('Invalid Checkout destination');
  return Response.json({url:result.url},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Sandbox checkout unavailable. Your access and credits are unchanged.'},{status:503});}
}
