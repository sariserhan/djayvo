import {after} from 'next/server';
import {accountsConfigured,services} from '../../../../lib/services';
import {isAdmin} from '../../../../lib/admin-access';
import {AdminStore} from '../../../../lib/admin-store';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
import {AudioError} from '../../../../lib/audio-validation';
import {deliverNotifications} from '../../../../lib/notifications';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{path:string[]}>}){
 try{
  if(!accountsConfigured())throw new AudioError('Administration is unavailable.',503);
  const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)throw new AudioError('Origin denied.',403);
  const session=await auth.api.getSession({headers:request.headers});if(!isAdmin(session?.user))throw new AudioError('Administrator access required.',403);
  const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Request too large.',413);
  let v;try{v=await bounded.json();if(!v||Array.isArray(v)||typeof v!=='object')throw Error();}catch{throw new AudioError('Invalid request.');}
  const {path}=await params,store=new AdminStore(pool,config.baseURL);let result;
  if(path.length===1&&path[0]==='settings')result=await store.settings(session!.user.id,v);
  else if(path.length===2&&path[0]==='users'&&Object.keys(v).join(',')==='suspended')result=await store.user(session!.user.id,path[1],v.suspended);
  else if(path.length===2&&path[0]==='tickets')result=await store.ticket(session!.user.id,path[1],v);
  else if(path.length===1&&path[0]==='notifications'&&Object.keys(v).length===0)result=await store.retry(session!.user.id);
  else throw new AudioError('Unknown admin action.',404);
  if(path[0]==='tickets'||path[0]==='notifications')after(async()=>{await deliverNotifications(pool,config);});
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Admin update failed. Refresh and try again.'},{status:e instanceof AudioError?e.status:503});}
}
