import {services,accountsConfigured} from '../../../../lib/services';import {academyStripe,billingReadiness,billingPublishableKey} from '../../../../lib/billing-mode';import {siteSettings} from '../../../../lib/site-settings';import {academyCheckout} from '../../../../lib/academy-payments';import {boundedAuthRequest} from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return Response.json({error:'Academy purchases are not open. The introduction remains free.'},{status:503});
 const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return new Response(null,{status:401});
 const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
 try{const data=await bounded.json();if(typeof data.key!=='string'||Object.keys(data).length!==1)throw new Error('Invalid request');
  const mode=(await siteSettings(pool)).billing_mode;if(!billingReadiness(mode).academyCheckoutEnabled)throw new Error('Checkout is not released');
  const {stripe,config:payment}=academyStripe(mode);
  const result=await academyCheckout(stripe,pool,session.user.id,data.key,config.baseURL,payment);
  if(!result.client_secret||result.ui_mode!=='embedded_page')throw new Error('Invalid embedded Checkout');
  return Response.json({clientSecret:result.client_secret,sessionId:result.id,publishableKey:billingPublishableKey(mode)},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Checkout unavailable. Your access and credits are unchanged.'},{status:503});}
}
export async function GET(request:Request){
 if(!accountsConfigured())return new Response(null,{status:503});
 const {auth,pool}=services(),session=await auth.api.getSession({headers:request.headers});
 if(!session?.user.emailVerified)return new Response(null,{status:401});
 const id=new URL(request.url).searchParams.get('session_id');
 if(!id||!/^cs_[A-Za-z0-9_]{1,200}$/.test(id))return new Response(null,{status:400});
 const mode=(await siteSettings(pool)).billing_mode;
 const row=(await pool.query('SELECT refund_hold,dispute_hold FROM academy_purchases WHERE receipt=$1 AND owner_id=$2 AND sandbox=$3',[id,session.user.id,mode==='test'])).rows[0];
 return Response.json({status:!row?'pending':row.refund_hold||row.dispute_hold?'reversed':'active'},{headers:{'Cache-Control':'private, no-store'}});
}
