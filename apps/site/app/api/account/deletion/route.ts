import {after} from 'next/server';
import {services,accountsConfigured} from '../../../../lib/services';
import {requestDeletion} from '../../../../lib/account-deletion';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
import {AudioError} from '../../../../lib/audio-validation';
import {deliverNotifications} from '../../../../lib/notifications';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function POST(request:Request){
 try{
  if(!accountsConfigured())throw new AudioError('Accounts unavailable.',503);
  const {pool,auth,config}=services();
  if(request.headers.get('origin')!==config.baseURL||request.headers.get('sec-fetch-site')==='cross-site')throw new AudioError('Origin denied.',403);
  const session=await auth.api.getSession({headers:request.headers});
  if(!session?.user.emailVerified)throw new AudioError('Verified sign-in required.',401);
  const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Request too large.',413);
  let body;try{body=await bounded.json();if(!body||Object.keys(body).join(',')!=='confirm')throw Error();}catch{throw new AudioError('Confirm the deletion request.');}
  const result=await requestDeletion(pool,config.baseURL,session.user.id,session.session.createdAt,body.confirm);
  after(async()=>{await deliverNotifications(pool,config);});
  return Response.json({request:result},{headers});
 }catch(error){return Response.json({error:error instanceof AudioError?error.message:'The deletion request was not confirmed. Please try again.'},{status:error instanceof AudioError?error.status:503,headers});}
}
