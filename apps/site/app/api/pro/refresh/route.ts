import {services,accountsConfigured} from '../../../../lib/services';
import {proAccess} from '../../../../lib/pro-access';
import {issueProLicense,verifyLicense} from '../../../../lib/pro-license';
export const runtime='nodejs';
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');const license=verifyLicense(token,{allowExpired:true});
 if(!license||license.sandbox||!accountsConfigured())return new Response(null,{status:401});
 try{if(!await proAccess(services().pool,license.subject,true))return new Response(null,{status:403});
  return Response.json({license:issueProLicense(license.subject)},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return new Response(null,{status:503});}
}
