import {dnaSong,localSingerRoot} from './dna-song';
import {boundedAuthRequest} from './bounded-request';
import {privateHeaders} from './audio-response';
import {listenerDirectory,readFeedback,saveFeedback,removeFeedback,removeAllFeedback,refreshFeedback} from './dna-feedback';
import {validateFeedback} from './dna-feedback-schema';
import type {DnaContext} from './dna-commerce';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
const state=globalThis as typeof globalThis&{jamloomFeedbackWrites?:Set<string>};
const writes=state.jamloomFeedbackWrites??=new Set<string>();
export async function dnaFeedback(request:Request,context?:DnaContext){
 let root:string;try{root=localSingerRoot(request);}catch(error){return json({error:(error as Error).message},503);}
 let claimed:string|undefined;
 try{
  const url=new URL(request.url),id=url.searchParams.get('id');
  const directory=listenerDirectory(root,request);
  if(request.method!=='GET'){
   if(writes.has(directory))return json({error:'Feedback is still saving. Please try again in a moment.'},409);
   writes.add(directory);claimed=directory;
  }
  if(request.method==='DELETE'&&id===null){await removeAllFeedback(directory);void refreshFeedback(root);return json({deleted:true});}
  if(!id||!/^[a-f0-9]{32}$/.test(id))return json({error:'Unknown song.'},400);
  if(request.method==='GET')return json({feedback:await readFeedback(directory,id)});
  if(request.method==='DELETE'){await removeFeedback(directory,id);void refreshFeedback(root);return json({deleted:true});}
  const bounded=await boundedAuthRequest(request,4096);if(!bounded)return json({error:'Feedback is too large.'},413);
  let value;try{value=validateFeedback(await bounded.json());}catch{return json({error:'Choose a rating and valid feedback options.'},400);}
  const check=await dnaSong(new Request(`${url.origin}/api/taste/song?id=${id}`,{headers:request.headers}),context),song=await check.json();
  if(!check.ok||song.state!=='completed'||!song.styleChecked)return json({error:'This song is not available for feedback.'},409);
  if(value.trainingConsent&&song.visibility&&!song.owned)return json({error:'Only the song owner can allow model training.'},403);
  const feedback=await saveFeedback(directory,id,value,song,root);
  void refreshFeedback(root);
  return json({feedback});
 }catch{return json({error:'Could not update feedback. Your song and favorites are safe.'},400);}
 finally{if(claimed)writes.delete(claimed);}
}
