import {services,accountsConfigured} from '../../../../lib/services';
import {proBilling} from '../../../../lib/pro-billing';
import {proCheckout} from '../../../../lib/pro-payments';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return new Response(null,{status:503});
 const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return Response.json({error:'Sign in with a verified account first.'},{status:401});
 const body=await boundedAuthRequest(request);if(!body)return new Response(null,{status:413});
 try{const data=await body.json();if(Object.keys(data).length!==1||typeof data.key!=='string')throw Error();
  const {stripe,config:payment,enabled}=proBilling();if(!enabled)throw Error();
  const result=await proCheckout(stripe,pool,session.user.id,data.key,config.baseURL,payment);
  const url=new URL(result.url??'');if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error();
  return Response.json({url:url.href,sessionId:result.id},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Pro checkout is unavailable. No payment was taken here. Try again shortly.'},{status:503});}
}
