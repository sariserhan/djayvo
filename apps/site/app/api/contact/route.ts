import {after} from 'next/server';
import {accountsConfigured,services} from '../../../lib/services';
import {AdminStore,ticketInput} from '../../../lib/admin-store';
import {boundedAuthRequest} from '../../../lib/bounded-request';
import {AudioError} from '../../../lib/audio-validation';
import {deliverNotifications} from '../../../lib/notifications';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){
 try{
  if(!accountsConfigured())throw new AudioError('Messages are temporarily unavailable. Email support@jamloom.com.',503);
  const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)throw new AudioError('Origin denied.',403);
  const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Message too large.',413);
  let value;try{value=await bounded.json();if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}catch{throw new AudioError('Invalid message.');}
  const input=ticketInput(value),session=await auth.api.getSession({headers:request.headers});
  const owner=session?.user.emailVerified&&session.user.email.toLowerCase()===input.email?session.user.id:undefined;
  const result=await new AdminStore(pool,config.baseURL).contact(value,request.headers.get('x-real-ip')??'unknown',owner);
  after(async()=>{await deliverNotifications(pool,config);});
  return Response.json(result,{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof AudioError?e.message:'Your message was not confirmed. Please try again or email support@jamloom.com.'},{status:e instanceof AudioError?e.status:503});}
}
