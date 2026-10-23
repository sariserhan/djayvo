import examples from '../../../assets/manifests/dna-examples.json';
import {r2AudioStore,type AudioStore} from './audio-store';
import {audioResponse,privateHeaders} from './audio-response';
import {localSingerRoot} from './dna-song';
import {musicAudioKey} from './music-storage';
import {validationSongs} from './music-validation';

export const exampleAudioKey=(song:typeof examples.examples[number])=>musicAudioKey('music-dna','public',song.id,song.audioSha256);

// Only the reviewed manifest can expose an R2 object; user songs keep their owner checks.
export async function dnaExample(request:Request,store:()=>Pick<AudioStore,'playbackURL'>=r2AudioStore,product?:'music-dna'|'improvise'):Promise<Response|null>{
 if(request.method!=='GET')return null;
 const url=new URL(request.url);
 const songs=product?validationSongs.filter(song=>song.product===product):validationSongs;
 if(url.searchParams.get('view')==='validation')return Response.json({songs,next:null,feedbackAvailable:false},{headers:privateHeaders});
 const sample=songs.find(song=>song.id===url.searchParams.get('id'));
 if(sample&&url.searchParams.get('file')==='audio'){
  try{return audioResponse(request,{url:await store().playbackURL(musicAudioKey(sample.product,'public',sample.id,sample.audioSha256),url.searchParams.has('download'),900)});}
  catch{return Response.json({error:'Test song is temporarily unavailable. Please try again.'},{status:503,headers:privateHeaders});}
 }
 if(product==='improvise')return null;
 let local=false;try{localSingerRoot(request);local=true;}catch{}
 if(url.searchParams.get('view')==='examples')return Response.json({songs:examples.examples,next:null,feedbackAvailable:local},{headers:privateHeaders});
 const song=examples.examples.find(song=>song.id===url.searchParams.get('id'));
 if(!song||url.searchParams.get('file')!=='audio'||local)return null;
 try{
  // Two-minute examples need room for pauses and seeking without an expired grant.
  return audioResponse(request,{url:await store().playbackURL(exampleAudioKey(song),url.searchParams.has('download'),900)});
 }catch{return Response.json({error:'Example audio is temporarily unavailable. Please try again.'},{status:503,headers:privateHeaders});}
}
