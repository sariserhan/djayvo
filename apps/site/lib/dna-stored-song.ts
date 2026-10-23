import type {DnaContext} from './dna-commerce';
import {audioResponse,privateHeaders} from './audio-response';
import {localSingerRoot} from './dna-song';

// Hosted reads never depend on the renderer's disk. Generation stays separately gated.
export async function storedDnaSong(request:Request,context?:DnaContext):Promise<Response|null>{
 const url=new URL(request.url),view=url.searchParams.get('view'),id=url.searchParams.get('id');
 if(!context&&request.method==='GET'&&(view==='public'||view==='mine'))return Response.json({songs:[],next:null,available:false,feedbackAvailable:false},{headers:privateHeaders});
 if(!context?.readOnly)try{localSingerRoot(request);return null;}catch{}
 if(!context||!['GET','DELETE'].includes(request.method))return null;
 const {commerce,owner}=context;
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
 if(view&&request.method==='GET'){
  if(view!=='public'&&view!=='mine')return json({error:'Unknown collection.'},400);
  if(view==='mine'&&!owner)return json({songs:[],next:null,signIn:true});
  const result=await commerce.list(owner,view,url.searchParams.get('after')??'',{language:url.searchParams.get('language')??'',genre:url.searchParams.get('genre')??''});
  return json({...result,accountFeedback:process.env.JAMLOOM_CLOUD_SONGS_ENABLED==='true',feedbackAvailable:commerce.product==='music-dna'&&process.env.JAMLOOM_CLOUD_SONGS_ENABLED==='true'});
 }
 if(!id&&request.method==='GET')return json({available:false,creditsEnabled:false,signedIn:!!owner});
 if(!id||!/^[a-f0-9]{32}$/.test(id))return json({error:'Song not found.'},404);
 const row=await commerce.row(id),owns=!!owner&&row?.owner_id===owner;
 if(!row||(!owns&&(row.visibility!=='public'||!row.public_consent_at||row.state!=='completed'||row.withdrawn_at)))return json({error:'Song not found.'},404);
 if(request.method==='DELETE'){
  if(!owns)return json({error:'Song not found.'},404);
  if(request.headers.get('x-jamloom-dna')!=='1'||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
  if(row.state!=='completed')return json({error:'This song is still being made.'},409);
  await commerce.withdraw(owner!,id);return json({withdrawn:true});
 }
 if(row.state!=='completed')return json({id,state:row.state,message:'Your song is not ready yet.'});
 if(!row.audio_key||!row.song_plan||!commerce.store)return json({error:'This song has not been transferred to cloud storage yet.'},503);
 const file=url.searchParams.get('file');
 if(file==='audio')return audioResponse(request,{url:await commerce.store.playbackURL(row.audio_key,url.searchParams.has('download'))});
 if(file==='plan'&&owns)return new Response(JSON.stringify(row.song_plan),{headers:{...privateHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="jamloom-song.json"'}});
 if(file)return json({error:'Unknown file.'},404);
 const plan=row.song_plan;
 return json({id,state:'completed',plan:owns?plan:{title:plan.title,language:plan.language?{code:plan.language.code,label:plan.language.label}:undefined,cases:plan.cases?.map((c:{lyrics:string;voice:string;bpm:number})=>({lyrics:c.lyrics,voice:c.voice,bpm:c.bpm}))},...(owns?{profile:row.profile}:{}),direction:{label:row.direction},styleChecked:row.product!=='improvise',visibility:row.visibility,withdrawn:!!row.withdrawn_at,owned:owns});
}
