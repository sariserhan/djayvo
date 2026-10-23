import {dnaSong} from '../../../../lib/dna-song';
import {dnaContext} from '../../../../lib/dna-context.server';
import {dnaExample} from '../../../../lib/dna-examples';
import {storedDnaSong} from '../../../../lib/dna-stored-song';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 try{
  const example=await dnaExample(request);if(example)return example;
  const context=await dnaContext(request);
  return await storedDnaSong(request,context)??await dnaSong(request,context);
 }
 catch{return Response.json({error:'Music DNA accounts are temporarily unavailable. Your favorites are safe.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
