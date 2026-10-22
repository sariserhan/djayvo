import {services,accountsConfigured} from '../../../../lib/services';
import {proAccess} from '../../../../lib/pro-access';
import {issueProLicense} from '../../../../lib/pro-license';
export const runtime='nodejs';
export async function GET(){
 return new Response(null,{status:405,headers:{Allow:'POST'}});
}
export async function POST(request:Request){
 if(!accountsConfigured())return new Response(null,{status:503});
 const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return new Response(null,{status:401});
 try{const live=process.env.PRO_BILLING_MODE==='live';if(!await proAccess(pool,session.user.id,live))return new Response(null,{status:403});
  return new Response(issueProLicense(session.user.id,!live),{headers:{'Content-Type':'text/plain','Content-Disposition':'attachment; filename="Jamloom-Pro.license"','Cache-Control':'private, no-store'}});
 }catch{return new Response(null,{status:503});}
}
