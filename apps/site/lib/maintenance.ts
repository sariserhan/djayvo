import {cleanupAuth} from './auth-cleanup';
import type {Pool} from 'pg';
import type {PrivateAudio} from './private-audio';

export async function maintenance(request:Request,getServices:()=>{pool:Pool;audio:PrivateAudio|null;config:{databaseURL:string}},env:Record<string,string|undefined>=process.env){
 const secret=env.CRON_SECRET;
 if(!secret||secret.length<32)return new Response(null,{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new Response(null,{status:401});
 if(!env.JAMLOOM_CLEANUP_TARGET||(env.VERCEL&&env.VERCEL_ENV!=='production'))return new Response(null,{status:503});
 try{
  const {pool,audio,config}=getServices(),target=new URL(config.databaseURL);
  if(env.JAMLOOM_CLEANUP_TARGET!==`${target.host}${target.pathname}`||!audio)return new Response(null,{status:503});
  const auth=await cleanupAuth(pool),files=await audio.cleanup();
  return Response.json({auth,audio:files},{status:files.failed?503:200});
 }catch{return Response.json({error:'Maintenance needs retry'},{status:503});}
}
