import {services,accountsConfigured} from '../../../../lib/services';
import {proAccess} from '../../../../lib/pro-access';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!accountsConfigured())return new Response(null,{status:503});
 const {auth,pool}=services(),s=await auth.api.getSession({headers:request.headers});if(!s?.user.emailVerified)return Response.json({active:false},{headers:{'Cache-Control':'private, no-store'}});
 try{return Response.json({active:await proAccess(pool,s.user.id,process.env.PRO_BILLING_MODE==='live')},{headers:{'Cache-Control':'private, no-store'}});}catch{return new Response(null,{status:503});}
}
