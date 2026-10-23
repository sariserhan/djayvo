import {createHash,randomUUID} from 'node:crypto';
import {access,mkdir,readdir,readFile,rename,writeFile,unlink,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {type DnaFeedback,validateFeedback} from './dna-feedback-schema';
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function refreshFeedback(root:string){
 try{const script=join(root,'scripts/train_dna_feedback.py');await access(script);
  const child=spawn(join(root,'.venv-singer/bin/python'),[script,'--root',root,'--auto'],{cwd:root,detached:true,stdio:'ignore',env:{...process.env,HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'}});child.once('error',()=>{});child.unref();
 }catch{/* Feedback stays saved if local training tools are unavailable. */}
}
export function listenerDirectory(root:string,request:Request){
 const key=request.headers.get('x-jamloom-listener');if(!key||!/^[a-f0-9]{32}$/.test(key))throw Error('This browser could not identify its feedback. Enable browser storage and try again.');
 return join(root,'renders/music-dna-feedback',sha(key));
}
export async function readFeedback(directory:string,id:string){
 try{return JSON.parse(await readFile(join(directory,id+'.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
export async function saveFeedback(directory:string,id:string,feedback:DnaFeedback,song:{plan:unknown;direction?:{id:string};styleChecked?:boolean},root:string){
 if(!/^[a-f0-9]{32}$/.test(id)||!song.styleChecked||!song.direction)throw Error('Feedback needs a completed, checked song.');
 const planText=await readFile(join(root,'renders/music-dna-songs',id,'plan.json'),'utf8'),plan=JSON.parse(planText);
 const receipt=JSON.parse(await readFile(join(root,'renders/music-dna-songs',id,'singer/complete.json'),'utf8'));
 if(sha(planText)!==receipt.plan_sha256)throw Error('Song changed before feedback could be saved.');
 const record={version:1,job:id,...validateFeedback(feedback),consentVersion:1,updatedAt:new Date().toISOString(),genre:song.direction.id,language:plan.cases[0].vocal_language??'en',plan_sha256:receipt.plan_sha256,audio_sha256:receipt.audio_sha256};
 await mkdir(directory,{recursive:true,mode:0o700});const temp=join(directory,`${id}.${randomUUID()}.tmp`);
 await writeFile(temp,JSON.stringify(record),{flag:'wx',mode:0o600});await rename(temp,join(directory,id+'.json'));return record;
}
export async function removeFeedback(directory:string,id:string){
 if(!/^[a-f0-9]{32}$/.test(id))throw Error('Invalid song');
 await unlink(join(directory,id+'.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
export async function removeAllFeedback(directory:string){await rm(directory,{recursive:true,force:true});}
export async function personalFeedback(root:string,request:Request,genre:string,language='auto'){
 if(!request.headers.get('x-jamloom-listener'))return [];
 const directory=listenerDirectory(root,request);
 let files:string[];try{files=await readdir(directory);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 const rows=[];
 for(const name of files.filter(n=>/^[a-f0-9]{32}\.json$/.test(n))){
  try{
   const row=await readFeedback(directory,name.slice(0,-5));
   if(!row||!row.personalize||row.genre!==genre||(language!=='auto'&&row.language!==language))continue;
   const f=validateFeedback(row),planText=await readFile(join(root,'renders/music-dna-songs',row.job,'plan.json'),'utf8');
   if(sha(planText)!==row.plan_sha256)continue;
   const plan=JSON.parse(planText);
   rows.push({rating:f.rating,tags:f.tags,language:row.language,traits:plan.musical_traits??null,bpm:plan.cases[0].bpm,updatedAt:row.updatedAt});
  }catch{/* Missing or changed sources cannot shape a new song. */}
 }
 return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,12);
}
