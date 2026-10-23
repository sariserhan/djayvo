import {dnaSong} from '../../../../lib/dna-song';
import {dnaContext} from '../../../../lib/dna-context.server';
import {dnaExample} from '../../../../lib/dna-examples';
import {storedDnaSong} from '../../../../lib/dna-stored-song';
import {hostedSongRequest} from '../../../../lib/cloud-songs.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
async function handle(request:Request){
 try{
  const example=await dnaExample(request);if(example)return example;
  const hosted=await hostedSongRequest(request,'music-dna');if(hosted)return hosted;
  const context=await dnaContext(request);
  return await storedDnaSong(request,context)??await dnaSong(request,context);
 }
 catch{return Response.json({error:'Music DNA accounts are temporarily unavailable. Your favorites are safe.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
