import {services,accountsConfigured} from '../../../lib/services';
import {LocalGeneration} from '../../../lib/generation-local';
import {AudioError,readBody,uuid} from '../../../lib/audio-validation';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
async function handle(request:Request){
 if(!accountsConfigured())return Response.json({error:'Generation unavailable.'},{status:503,headers});
 try{
  const {auth,pool,config,audio}=services();
  if(!config.local||process.env.JAMLOOM_GENERATION_SANDBOX!=='true'||!audio?.store.local)
   return Response.json({error:'Paid generation is closed. Local rehearsal is not enabled here.'},{status:503,headers});
  if(request.method!=='GET'&&request.headers.get('origin')!==config.baseURL)return Response.json({error:'Origin denied.'},{status:403,headers});
  const session=await auth.api.getSession({headers:request.headers});
  if(!session?.user.emailVerified)return Response.json({error:'Sign in with a verified account.'},{status:401,headers});
  const owner=session.user.id,service=new LocalGeneration(pool,audio.store,config.secret);
  if(request.method==='GET')return Response.json({jobs:await service.status(owner)},{headers});
  const data=JSON.parse((await readBody(request.body,5_000_000)).toString());
  if(data?.action==='quote')return Response.json(await service.quote(owner,data.input),{headers});
  if(data?.action==='submit')return Response.json({id:await service.submit(owner,data.requestId,data.input,data.token)},{headers});
  if(data?.action==='cancel'){uuid(data.id);await service.cancel(owner,data.id);return Response.json({cancelled:true},{headers});}
  return Response.json({error:'Unknown generation action.'},{status:400,headers});
 }catch(error){return Response.json({error:'Request could not complete. Check the source, plan, quote and available credits. Refresh job history before retrying.'},{status:error instanceof AudioError?error.status:400,headers});}
}
export const GET=handle;export const POST=handle;
