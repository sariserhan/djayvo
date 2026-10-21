import {accountsConfigured,services} from '../../../lib/services';
import {cachedSiteSettings} from '../../../lib/site-settings';
export const runtime='nodejs';
export async function GET(){
 try{const s=accountsConfigured()?await cachedSiteSettings(services().pool):{banner:''};return Response.json({banner:s.banner},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({banner:''},{status:503,headers:{'Cache-Control':'no-store'}});}
}
