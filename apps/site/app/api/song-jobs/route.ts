import {hostedSongs} from '../../../lib/cloud-songs.server';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 try{const result=await Promise.all((['music-dna','improvise'] as const).map(product=>hostedSongs(product)?.sweep()));return Response.json({result});}
 catch{return Response.json({error:'Song recovery pending'},{status:503});}
}
