import {randomUUID,randomInt,createHash} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {access,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {validateTaste} from './taste';
import {favoriteList} from './taste-auto';
import {musicDirection} from './taste-direction';
import {audioResponse,privateHeaders} from './audio-response';
import {boundedAuthRequest} from './bounded-request';

type Running={id:string;child:ChildProcess;timer:ReturnType<typeof setTimeout>;cancelled?:boolean};
const state=globalThis as typeof globalThis&{jamloomDnaSong?:Running;jamloomDnaStarting?:boolean};
const idPattern=/^[a-f0-9]{32}$/;
const unavailable='Full-song generation is not available on this server yet. Your favorites are saved; no instrumental substitute will be generated.';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});

// shortcut: an explicitly enabled, loopback-only Mac preview; hosted jobs need authenticated workers before release.
export function localSingerRoot(request:Request,configured=process.env.JAMLOOM_DNA_SINGER_ROOT){
 if(!configured||!isAbsolute(configured))throw Error(unavailable);
 const url=new URL(request.url),host=request.headers.get('host')??url.host;
 const forwarded=request.headers.get('x-forwarded-for');
 if(!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)||(forwarded&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(forwarded))||request.headers.get('sec-fetch-site')==='cross-site')throw Error('Local singer access denied.');
 const origin=request.headers.get('origin');
 if(origin&&(!/^https?:$/.test(new URL(origin).protocol)||new URL(origin).host!==host))throw Error('Local singer access denied.');
 if(request.method!=='GET'&&request.headers.get('x-jamloom-dna')!=='1')throw Error('Local singer access denied.');
 return configured;
}
export function songInput(value:unknown){
 const profile=favoriteList(validateTaste(value));
 if(!profile.references.length)throw Error('Add at least one favorite first.');
 return {references:profile.references,referenceMetadata:profile.referenceMetadata??[]};
}
function stop(active:Running){
 if(active.child.pid){try{process.kill(-active.child.pid,'SIGKILL');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;}}
}
export async function dnaSong(request:Request){
 let root:string;
 try{root=localSingerRoot(request);}catch(error){return json({error:(error as Error).message},503);}
 const directory=join(root,'renders/music-dna-songs'),url=new URL(request.url),id=url.searchParams.get('id');
 try{
  if(request.method==='POST'){
   if(state.jamloomDnaSong||state.jamloomDnaStarting)return json({error:'A song is already being made on this Mac. Wait for it to finish.'},409);
   const bounded=await boundedAuthRequest(request,65536);if(!bounded)return json({error:'Favorites list is too large.'},413);
   let profile:ReturnType<typeof songInput>;
   try{profile=songInput(await bounded.json());}catch{return json({error:'Add a valid list of one to twenty favorite songs or artists.'},400);}
   const direction=musicDirection(profile);
   if(!direction)return json({error:'We could not identify a style from this list yet. Choose a specific song or artist from search.'},422);
   await access(join(root,'.venv-singer/bin/python'));await access(join(root,'scripts/music_dna_song.py'));
   await access(join(root,'build-style-training/taste-auditor/pytorch_model.bin'));
   // Recheck after asynchronous validation so simultaneous requests cannot both claim this process.
   if(state.jamloomDnaSong||state.jamloomDnaStarting)return json({error:'A song is already being made on this Mac.'},409);
   const next=randomUUID().replaceAll('-',''),work=join(directory,next);
   state.jamloomDnaStarting=true;
   try{
    await mkdir(work,{recursive:true,mode:0o700});
    await writeFile(join(work,'input.json'),JSON.stringify({profile,direction,seed:randomInt(2**32)}),{flag:'wx',mode:0o600});
    await writeFile(join(work,'status.json'),JSON.stringify({state:'running',message:'Starting your song…'}));
   }catch(error){delete state.jamloomDnaStarting;throw error;}
   const child=spawn(join(root,'.venv-singer/bin/python'),[join(root,'scripts/music_dna_song.py'),'run',work],{
    cwd:root,detached:true,stdio:'ignore',env:{...process.env,HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'},
   });
   const active:Running={id:next,child,timer:setTimeout(()=>{stop(active);},31*60*1000)};
   state.jamloomDnaSong=active;
   delete state.jamloomDnaStarting;
   const finish=async()=>{
    clearTimeout(active.timer);
    try{const status=JSON.parse(await readFile(join(work,'status.json'),'utf8'));if(!active.cancelled&&status.state==='running')await writeFile(join(work,'status.json'),JSON.stringify({state:'failed',message:'Song generation stopped. Your favorites and previous songs are safe.'}));}catch{}
    if(state.jamloomDnaSong===active)delete state.jamloomDnaSong;
   };
   child.once('error',()=>{void finish();});child.once('exit',()=>{void finish();});
   return json({id:next},202);
  }
  if(!id){
   await access(join(root,'.venv-singer/bin/python'));
   await access(join(root,'build-style-training/taste-auditor/pytorch_model.bin'));
   return json({available:true,active:state.jamloomDnaSong?.id});
  }
  if(!idPattern.test(id))return json({error:'Unknown song.'},404);
  const work=join(directory,id);
  if(request.method==='DELETE'){
   const active=state.jamloomDnaSong;
   if(active?.id===id){
    active.cancelled=true;
    stop(active);
    await new Promise<void>(resolve=>{if(active.child.exitCode!==null||active.child.signalCode!==null)resolve();else active.child.once('close',()=>resolve());});
    await writeFile(join(work,'status.json'),JSON.stringify({state:'cancelled',message:'Song stopped. Your favorites and previous songs are safe.'}));
   }else{
    const status=JSON.parse(await readFile(join(work,'status.json'),'utf8'));
    if(status.state==='running')return json({error:'This song is running in another server session. Check its status before starting another.'},409);
   }
   return json({state:'cancelled'});
  }
  const status=JSON.parse(await readFile(join(work,'status.json'),'utf8'));
  const inputBytes=await readFile(join(work,'input.json'));
  const input=JSON.parse(inputBytes.toString());
  let plan,planBytes:Buffer|undefined,fit;
  try{planBytes=await readFile(join(work,'plan.json'));plan=JSON.parse(planBytes.toString());}catch{}
  const legacy=!input.direction&&!plan?.input_sha256;
  if(status.state==='completed'&&!legacy){
   const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
   fit=JSON.parse(await readFile(join(work,'fit.json'),'utf8'));
   const receipt=JSON.parse(await readFile(join(work,'singer/complete.json'),'utf8'));
   const audioPath=join(work,'singer/singer.wav');
   if((await stat(audioPath)).size>24_000_000)throw Error('Invalid output');
   if(!planBytes||!plan||fit?.accepted!==true||fit.target!==input.direction?.id||JSON.stringify(plan.direction)!==JSON.stringify(input.direction)||
      plan.input_sha256!==sha(inputBytes)||fit.input_sha256!==sha(inputBytes)||fit.plan_sha256!==sha(planBytes)||receipt.plan_sha256!==sha(planBytes)||
      fit.audio_sha256!==receipt.audio_sha256||fit.audio_sha256!==sha(await readFile(audioPath))){
    const message='This song could not be matched to its saved favorites. Your list is safe; please make another take.';
    return url.searchParams.has('file')?json({error:message},409):json({id,state:'rejected',message});
   }
  }
  const file=url.searchParams.get('file');
  if(file){
   if(status.state!=='completed')return json({error:'This song is not ready.'},409);
   if(file==='audio'){
    const path=join(work,'singer/singer.wav');if((await stat(path)).size>24_000_000)throw Error('Invalid output');
    try{
     const response=audioResponse(request,{data:await readFile(path)},url.searchParams.has('download'));
     response.headers.set('Content-Disposition',`${url.searchParams.has('download')?'attachment':'inline'}; filename="jamloom-song-${id.slice(0,8)}.wav"`);
     return response;
    }catch{return new Response(null,{status:416,headers:privateHeaders});}
   }
   if(file==='plan')return new Response(await readFile(join(work,'plan.json'),'utf8'),{headers:{...privateHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="jamloom-song.json"'}});
   return json({error:'Unknown file.'},404);
  }
  return json({...status,id,plan,profile:input.profile,direction:input.direction,legacy,styleChecked:!legacy&&status.state==='completed'&&fit?.accepted===true});
 }catch(error){
  return json({error:(error as NodeJS.ErrnoException).code==='ENOENT'?'Song or local singer setup was not found.':'Could not access song generation. Your saved favorites are unchanged.'},(error as NodeJS.ErrnoException).code==='ENOENT'?404:500);
 }
}
