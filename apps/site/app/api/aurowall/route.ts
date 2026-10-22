import {proRequest} from '../../../lib/pro-request';
import {aurowallTracks} from '../../../lib/aurowall';
export const runtime='nodejs';
export async function GET(request:Request){try{if(!await proRequest(request))return new Response(null,{status:403});return Response.json({tracks:(await aurowallTracks()).map(({key,etag,...track})=>track)},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Aurowall music is unavailable. Please try again shortly.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
