import {hostedSongRequest} from '../../../../lib/cloud-songs.server';
import {dnaContext} from '../../../../lib/dna-context.server';
import {DnaCommerce} from '../../../../lib/dna-commerce';
import {storedDnaSong} from '../../../../lib/dna-stored-song';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
async function handle(request:Request){
 try{
  const hosted=await hostedSongRequest(request,'improvise');if(hosted)return hosted;
  const context=await dnaContext(request);
  if(context){const c=context.commerce;context.commerce=new DnaCommerce(c.pool,'read-only',c.store,{...c.options,product:'improvise'});context.readOnly=true;
   const stored=await storedDnaSong(request,context);if(stored)return stored;}
  return Response.json({available:false,creditsEnabled:false,error:'Song creation is not open here yet. Your recording stays on your device.'},{status:request.method==='GET'?200:503,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Song creation is temporarily unavailable. Your recording is safe.'},{status:503});}
}
export const GET=handle;export const POST=handle;export const DELETE=handle;
