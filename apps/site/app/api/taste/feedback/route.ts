import {dnaFeedback} from '../../../../lib/dna-feedback-api';
import {dnaContext} from '../../../../lib/dna-context.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 try{return await dnaFeedback(request,await dnaContext(request));}
 catch{return Response.json({error:'Feedback is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
