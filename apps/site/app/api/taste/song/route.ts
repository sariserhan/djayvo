import {dnaSong} from '../../../../lib/dna-song';
import {dnaContext} from '../../../../lib/dna-context.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 try{return await dnaSong(request,await dnaContext(request));}
 catch{return Response.json({error:'Music DNA accounts are temporarily unavailable. Your favorites are safe.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
