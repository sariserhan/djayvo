import {aurowallTracks} from '../../../lib/aurowall';
export const runtime='nodejs';
export async function GET(){try{return Response.json({tracks:(await aurowallTracks()).map(({key,etag,...track})=>track)},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Aurowall music is unavailable. Please try again shortly.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
