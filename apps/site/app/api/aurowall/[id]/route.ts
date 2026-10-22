import {proRequest} from '../../../../lib/pro-request';
import {aurowallAudio} from '../../../../lib/aurowall';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))return new Response(null,{status:404});try{if(!await proRequest(request))return new Response(null,{status:403});return await aurowallAudio(request,id);}catch{return Response.json({error:'This Aurowall track is unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
