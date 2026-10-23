import {randomInt,createHash} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {access,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {validateTaste} from './taste';
import {favoriteList} from './taste-auto';
import {personalFeedback,refreshFeedback} from './dna-feedback';
import {musicDirection} from './taste-direction';
import {audioResponse,privateHeaders} from './audio-response';
import {boundedAuthRequest} from './bounded-request';
import {songCountry} from './dna-location';
import {type DnaContext,DNA_RUNTIME_MS,visibilityInput} from './dna-commerce';
import {AudioError} from './audio-validation';
import examples from '../../../assets/manifests/dna-examples.json';

type Running={id:string;owner:string;child:ChildProcess;timer:ReturnType<typeof setTimeout>;cancelled?:boolean;completion?:Promise<void>};
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
 return {references:profile.references,referenceMetadata:profile.referenceMetadata??[],...(profile.vocalLanguage?{vocalLanguage:profile.vocalLanguage}:{})};
}
function stop(active:Running){
 if(active.child.pid){try{process.kill(-active.child.pid,'SIGKILL');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;}}
}
async function songFiles(root:string,id:string){
 const work=join(root,'renders/music-dna-songs',id);
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
    status.state='rejected';status.message=message;
   }
  }
 return {status,input,plan,fit,legacy};
}
export async function dnaSong(request:Request,context?:DnaContext){
 let root:string;
 try{root=localSingerRoot(request);}catch(error){return json({error:(error as Error).message},503);}
 const directory=join(root,'renders/music-dna-songs'),url=new URL(request.url),id=url.searchParams.get('id');
 const commerce=context?.commerce,owner=context?.owner;
 const example=id&&examples.examples.some(song=>song.id===id);
 try{
  const view=url.searchParams.get('view');
  if(request.method==='GET'&&view){
   if(view==='examples')return json({songs:examples.examples,next:null});
   if(view!=='public'&&view!=='mine')return json({error:'Unknown collection.'},400);
   if(!commerce)return json({songs:[],next:null,available:false});
   if(view==='mine'&&!owner)return json({songs:[],next:null,signIn:true});
   if(view==='mine'&&owner)for(const pending of await commerce.pending(owner))await dnaSong(new Request(`${url.origin}/api/taste/song?id=${pending.id}`,{headers:request.headers}),context);
   return json(await commerce.list(owner??null,view,url.searchParams.get('after')??''));
  }
  if(request.method==='POST'){
   if(!commerce)return json({error:'Credit-backed generation is not enabled here yet. You can listen to the examples below.'},503);
   if(!owner)return json({error:'Sign in with a verified account to use your credits.'},401);
   const bounded=await boundedAuthRequest(request,65536);if(!bounded)return json({error:'Favorites list is too large.'},413);
   let body,profile:ReturnType<typeof songInput>;
   try{body=await bounded.json();profile=songInput(body.profile);}catch{return json({error:'Add a valid list of one to twenty favorite songs or artists.'},400);}
   const visibility=visibilityInput(body.visibility,body.publicConsent),direction=musicDirection(profile);
   if(!direction)return json({error:'We could not identify a style from this list yet. Choose a specific song or artist from search.'},422);
   if(body.action==='quote')return json(await commerce.quote(owner,profile,visibility));
   if(body.action!=='submit')return json({error:'Get a quote before making your song.'},400);
   if(typeof body.requestId!=='string'||!/^[a-f0-9]{32}$/.test(body.requestId))return json({error:'Invalid song request.'},400);
   const prior=await commerce.row(body.requestId);
   if(prior&&prior.owner_id!==owner)return json({error:'Song not found.'},404);
   if(prior){
    const saved=await commerce.submit(owner,body.requestId,profile,visibility,body.token);
    if(saved.state!=='queued')return json({id:saved.id},202);
   }
   if(state.jamloomDnaSong||state.jamloomDnaStarting)return json({error:'A song is already being made on this Mac. Wait for it to finish.'},409);
   await access(join(root,'.venv-singer/bin/python'));await access(join(root,'scripts/music_dna_song.py'));
   await access(join(root,'build-style-training/taste-auditor/pytorch_model.bin'));
   const feedback=await personalFeedback(root,request,direction.id,profile.vocalLanguage??'auto');
   const country=(!profile.vocalLanguage||profile.vocalLanguage==='auto')?await songCountry(request):null;
   if(state.jamloomDnaSong||state.jamloomDnaStarting)return json({error:'A song is already being made on this Mac.'},409);
   state.jamloomDnaStarting=true;
   const next=body.requestId,work=join(directory,next);
   let reserved=false;
   try{
    await commerce.submit(owner,next,profile,visibility,body.token);reserved=true;
    if(!await commerce.start(next)){
     if((await commerce.row(next))?.state!=='queued')return json({id:next},202);
     throw Error('Song could not start');
    }
    await mkdir(work,{recursive:true,mode:0o700});
    await writeFile(join(work,'input.json'),JSON.stringify({profile,direction,feedback,country,seed:randomInt(2**32)}),{flag:'wx',mode:0o600});
    await writeFile(join(work,'status.json'),JSON.stringify({state:'running',message:'Starting your song…'}));
    const child=spawn(join(root,'.venv-singer/bin/python'),[join(root,'scripts/music_dna_song.py'),'run',work,'--deadline-seconds',String(DNA_RUNTIME_MS/1000)],{
     cwd:root,detached:true,stdio:'ignore',env:{...process.env,HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'},
    });
    const active:Running={id:next,owner,child,timer:setTimeout(()=>{stop(active);},DNA_RUNTIME_MS)};
    state.jamloomDnaSong=active;
    const finish=()=>active.completion??=(async()=>{
     clearTimeout(active.timer);
     try{
      let result;try{result=await songFiles(root,next);}catch{}
      const completed=!active.cancelled&&result?.status.state==='completed';
      const terminal=completed?'completed':active.cancelled?'cancelled':'failed';
      await writeFile(join(work,'status.json'),JSON.stringify({state:terminal,message:completed?'Your song is ready.':active.cancelled?'Song cancelled. Reserved credits released.':'Song did not pass generation. Reserved credits released.'}));
      await commerce.finish(next,terminal,completed?{title:result!.plan.title,language:result!.plan.cases[0].vocal_language??'en',direction:direction.label}:undefined);
     }catch{console.error('Music DNA settlement needs recovery; credits remain held.');}
     finally{if(state.jamloomDnaSong===active)delete state.jamloomDnaSong;void refreshFeedback(root);}
    })();
    child.once('error',()=>{void finish();});child.once('exit',()=>{void finish();});
    if(child.pid)await writeFile(join(work,'process.json'),JSON.stringify({pid:child.pid}));
    return json({id:next},202);
   }catch(error){
    const active=state.jamloomDnaSong;
    if(active&&active.id===next){stop(active);await new Promise<void>(resolve=>active.child.exitCode!==null||active.child.signalCode!==null?resolve():active.child.once('exit',()=>resolve()));await active.completion;}
    else if(reserved)await commerce.finish(next,'failed');
    throw error;
   }
   finally{delete state.jamloomDnaStarting;}
  }
  if(!id){
   await access(join(root,'.venv-singer/bin/python'));await access(join(root,'build-style-training/taste-auditor/pytorch_model.bin'));
   if(commerce&&owner)for(const pending of await commerce.pending(owner))await dnaSong(new Request(`${url.origin}/api/taste/song?id=${pending.id}`,{headers:request.headers}),context);
   return json({available:!!commerce,creditsEnabled:!!commerce,signedIn:!!owner,balance:commerce&&owner?await commerce.wallet.balance(owner):null,active:state.jamloomDnaSong?.owner===owner?state.jamloomDnaSong?.id:undefined,busy:!!state.jamloomDnaSong,mode:'local_credit_rehearsal'});
  }
  if(!idPattern.test(id))return json({error:'Unknown song.'},404);
  let record=example?null:await commerce?.row(id);
  const owns=!!owner&&record?.owner_id===owner;
  if(!example&&(!record||(!owns&&(record.visibility!=='public'||record.state!=='completed'||record.withdrawn_at))))return json({error:'Song not found.'},404);
  const work=join(directory,id);
  if(record&&commerce&&state.jamloomDnaSong?.id!==id&&['queued','running'].includes(record.state)){
   const expired=Date.now()-new Date(record.started_at??record.created_at).getTime()>(record.state==='queued'?60000:DNA_RUNTIME_MS+60000);
   if(expired){
    let alive=false;try{const {pid}=JSON.parse(await readFile(join(work,'process.json'),'utf8'));process.kill(pid,0);alive=true;}catch{}
    if(!alive){
     let result;try{result=await songFiles(root,id);}catch{}
     if(!result||!['completed','failed','cancelled','rejected'].includes(result.status.state)){
      await commerce.finish(id,'failed');return json({id,state:'failed',message:'Generation stopped. Reserved credits released.'});
     }
    }
   }
  }
  if(request.method==='DELETE'){
   if(!owns||!commerce)return json({error:'Song not found.'},404);
   if(record.state==='completed'){await commerce.withdraw(owner!,id);return json({withdrawn:true});}
   const active=state.jamloomDnaSong;
   if(active?.id===id){
    active.cancelled=true;stop(active);
    await new Promise<void>(resolve=>{if(active.child.exitCode!==null||active.child.signalCode!==null)resolve();else active.child.once('exit',()=>resolve());});
    await active.completion;
    return json({state:'cancelled'});
   }
   if(record.state==='queued'){await commerce.finish(id,'cancelled');return json({state:'cancelled'});}
   return json({error:'This song is stopping or recovering. Refresh its status.'},409);
  }
  const result=await songFiles(root,id),{input,plan,fit,legacy}=result;let status=result.status;
  if(record&&commerce&&record.state==='running'&&state.jamloomDnaSong?.id!==id){
   if(['completed','failed','rejected','cancelled'].includes(status.state)){
    await commerce.finish(id,status.state==='completed'?'completed':status.state==='cancelled'?'cancelled':'failed',status.state==='completed'?{title:plan.title,language:plan.cases[0].vocal_language??'en',direction:input.direction.label}:undefined);
    record=await commerce.row(id);
   }else if(Date.now()-new Date(record.started_at).getTime()>DNA_RUNTIME_MS+60000){
    let alive=false;try{const {pid}=JSON.parse(await readFile(join(work,'process.json'),'utf8'));process.kill(pid,0);alive=true;}catch{}
    if(!alive){await commerce.finish(id,'failed');record=await commerce.row(id);status={state:'failed',message:'Generation stopped. Reserved credits released.'};}
   }
  }
  // Finished audio is not available until its reservation has settled.
  if(record&&record.state!=='completed'&&status.state==='completed')status={state:'running',message:'Saving your song and settling credits…'};
  if(record&&['failed','cancelled'].includes(record.state))status={state:record.state,message:'Song stopped. Reserved credits released.'};
  const file=url.searchParams.get('file');
  if(file){
   if(status.state!=='completed')return json({error:'This song is not ready.'},409);
   if(file==='audio'){
    const path=join(work,'singer/singer.wav');if((await stat(path)).size>24_000_000)throw Error('Invalid output');
    try{const response=audioResponse(request,{data:await readFile(path)},url.searchParams.has('download'));
     response.headers.set('Content-Disposition',`${url.searchParams.has('download')?'attachment':'inline'}; filename="jamloom-song-${id.slice(0,8)}.wav"`);return response;
    }catch{return new Response(null,{status:416,headers:privateHeaders});}
   }
   if(file==='plan'&&(example||owns))return new Response(await readFile(join(work,'plan.json'),'utf8'),{headers:{...privateHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="jamloom-song.json"'}});
   return json({error:'Unknown file.'},404);
  }
  const publicPlan=plan?{title:plan.title,language:plan.language,cases:plan.cases?.map((c:{lyrics:string;voice:string;bpm:number})=>({lyrics:c.lyrics,voice:c.voice,bpm:c.bpm}))}:undefined;
  return json({...status,id,plan:example||owns?plan:publicPlan,...(example||owns?{profile:input.profile}:{}),direction:example||owns?input.direction:{id:input.direction?.id,label:input.direction?.label},legacy,styleChecked:!legacy&&status.state==='completed'&&fit?.accepted===true,visibility:record?.visibility,withdrawn:!!record?.withdrawn_at,owned:owns});
 }catch(error){
  if(error instanceof AudioError)return json({error:error.message},error.status);
  if(error instanceof Error&&/Insufficient credits|Quote changed|Changed quote|Invalid quote|One active job|frozen|suspended/.test(error.message))return json({error:error.message},409);
  return json({error:(error as NodeJS.ErrnoException).code==='ENOENT'?'Song or local singer setup was not found.':'Could not access song generation. Your saved favorites are unchanged.'},(error as NodeJS.ErrnoException).code==='ENOENT'?404:500);
 }
}
