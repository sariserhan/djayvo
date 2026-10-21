import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,isAbsolute,relative} from 'node:path';
import type {Pool} from 'pg';
import type {AudioStore} from './audio-store';
import {PrivateAudio} from './private-audio';
import {Wallet,type JobBudget} from './wallet';
import {GenerationQueue} from './generation-queue';
import {verifyPermit,runBudgeted} from './generation-budget';
import {signQuote,verifyQuote} from './generation-quote';
import {STRATEGIES,validateWav,MAX_AUDIO_BYTES} from './audio-validation';

const hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export type LocalGenerationInput={source:string;plan:string;title:string;consent:true};
type LocalResult={id:string;state:'cancelled'}|{id:string;state:'completed';outputId:string;sha256:string;modeledCostMicros:number;externalSpendMicros:0};
function input(value:LocalGenerationInput){
 if(!value||value.consent!==true||typeof value.source!=='string'||value.source.length>1_300_000||
  !/^[A-Za-z0-9+/]+={0,2}$/.test(value.source)||typeof value.plan!=='string'||Buffer.byteLength(value.plan)>1_000_000||
  typeof value.title!=='string'||!value.title.trim()||value.title.length>120||/[\x00-\x1f\x7f]/.test(value.title))throw Error('Invalid generation input or consent');
 const source=Buffer.from(value.source,'base64');
 if(source.length<44||source.length>960044||source.toString('ascii',0,4)!=='RIFF'||source.readUInt32LE(4)!==source.length-8||source.toString('ascii',8,12)!=='WAVE')throw Error('Invalid source WAV');
 let format:Buffer|undefined,dataBytes:number|undefined;
 for(let at=12;at<source.length;){
  if(at+8>source.length)throw Error('Truncated source chunk');
  const size=source.readUInt32LE(at+4),end=at+8+size;
  if(end+(size%2)>source.length)throw Error('Invalid source chunk size');
  const type=source.toString('ascii',at,at+4);
  if(type==='fmt '){if(format||size!==16)throw Error('Use PCM16 WAV');format=source.subarray(at+8,end);}
  if(type==='data'){if(dataBytes!==undefined)throw Error('Repeated source data');dataBytes=size;}
  at=end+(size%2);
 }
 if(!format||dataBytes===undefined||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16)throw Error('Use PCM16 WAV');
 const channels=format.readUInt16LE(2),rate=format.readUInt32LE(4),seconds=dataBytes/(rate*2*channels);
 if(![1,2].includes(channels)||rate<8000||rate>48000||seconds<2||seconds>5||!Number.isInteger(dataBytes/(2*channels))||format.readUInt32LE(8)!==rate*2*channels||format.readUInt16LE(12)!==2*channels)throw Error('Invalid source duration or format');
 const plan=JSON.parse(value.plan);
 if(!plan||!STRATEGIES.includes(plan.strategy)||plan.source?.sha256!==hash(source)||plan.source?.consent_confirmed!==true)throw Error('Plan must match the consented source');
 return {source,plan,planText:value.plan,title:value.title.trim(),inputSha256:hash(source),planSha256:hash(value.plan)};
}

// Explicit local rehearsal only: modeled cost is not a provider invoice or release approval.
export class LocalGeneration {
 private wallet:Wallet;private queue:GenerationQueue;
 constructor(private pool:Pool,private store:AudioStore,private secret:string){
  if(!store.local)throw Error('Local rehearsal requires local storage');
  this.wallet=new Wallet(pool);this.queue=new GenerationQueue(pool,secret);
 }
 async quote(owner:string,value:LocalGenerationInput){
  const v=input(value),job:JobBudget={inputSha256:v.inputSha256,planSha256:v.planSha256,maxRuntimeMs:120000,hourlyMicros:750000,fixedCostMicros:10000};
  const price=await this.wallet.quote(owner,100000,5000,'private');
  const quote={version:1 as const,owner,expiresAt:Date.now()+300000,credits:price.credits,costCapMicros:price.costCapMicros,marginBps:price.marginBps,visibility:'private' as const,job};
  return {...price,expiresAt:quote.expiresAt,token:signQuote(quote,this.secret),mode:'local_rehearsal'};
 }
 async submit(owner:string,key:string,value:LocalGenerationInput,token:string){
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw Error('Invalid request key');
  const q=verifyQuote(token,owner,this.secret),v=input(value);
  if(q.job.inputSha256!==v.inputSha256||q.job.planSha256!==v.planSha256)throw Error('Input changed; request a new quote');
  const digest=hash(JSON.stringify([owner,key,v.inputSha256]));
  const inputKey=`uploads/${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20,32)}.wav`;
  // Content-bound keys keep a changed retry from replacing a queued job's source.
  const job={...q.job,render:{inputKey,plan:v.planText,title:v.title,ready:false}};
  const id=await this.wallet.reserve(owner,key,q.costCapMicros,q.marginBps,job,q.visibility,q.credits);
  const current=(await this.pool.query('SELECT state FROM generation_jobs WHERE reservation_id=$1 AND owner_id=$2',[id,owner])).rows[0];
  if(current.state!=='queued')return id;
  try{
   await this.store.put(inputKey,v.source);
   const ready=await this.pool.query(`UPDATE generation_jobs SET budget=jsonb_set(budget,'{render,ready}','true') WHERE reservation_id=$1 AND state='queued'`,[id]);
   if(!ready.rowCount){
    const state=(await this.pool.query('SELECT state FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0]?.state;
    if(['completed','failed','cancelled'].includes(state))await this.store.remove(inputKey);
   }
  }catch(error){await this.queue.cancel(owner,id);throw error;}
  return id;
 }
 async status(owner:string){
  return (await this.pool.query(`SELECT j.reservation_id AS id,j.state,j.created_at,a.track_id AS output_id
   FROM generation_jobs j LEFT JOIN track_assets a ON a.request_id=j.reservation_id AND a.owner_id=j.owner_id AND a.state='ready' AND j.state='completed'
   WHERE j.owner_id=$1 ORDER BY j.created_at DESC LIMIT 50`,[owner])).rows;
 }
 async cancel(owner:string,id:string){
  await this.queue.cancel(owner,id);
  const row=(await this.pool.query('SELECT state,budget FROM generation_jobs WHERE reservation_id=$1 AND owner_id=$2',[id,owner])).rows[0];
  if(row?.state==='cancelled'&&row.budget.render?.inputKey)await this.store.remove(row.budget.render.inputKey);
 }
 private async complete(id:string,directory:string):Promise<LocalResult>{
  const row=(await this.pool.query('SELECT * FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0];
  const payload=row.budget.render,result=payload.result;
  if(!result||!/^generation-[a-zA-Z0-9]+\/result\.[a-z_]+\.wav$/.test(result.path))throw Error('Invalid recovery receipt');
  const audio=new PrivateAudio(this.pool,this.store);
  if(row.cancel_requested){
   const asset=(await this.pool.query('SELECT track_id FROM track_assets WHERE request_id=$1 AND owner_id=$2',[id,row.owner_id])).rows[0];
   if(asset)await audio.remove(row.owner_id,asset.track_id);
   await this.queue.stopped(id,row.lease_token,Number(row.actual_cost_micros),'cancelled');
   await this.store.remove(payload.inputKey).catch(()=>{});
   return {id,state:'cancelled'};
  }
  const path=join(directory,result.path);
  if((await stat(path)).size>MAX_AUDIO_BYTES)throw Error('Output exceeds storage bound');
  const wav=await readFile(path),sha=hash(wav);validateWav(wav,wav.length,result.sha256);
  const plan=JSON.parse(payload.plan);
  const saved=await audio.reserve(row.owner_id,{requestId:id,title:payload.title,strategy:plan.strategy,bytes:wav.length,sha256:sha,consent:true});
  if(!saved.ready){await audio.localUpload(row.owner_id,saved.id,wav);await audio.finalize(row.owner_id,saved.id);}
  // A failed save leaves the render receipt held; retry never starts a second renderer.
  try{await this.queue.stopped(id,row.lease_token,Number(row.actual_cost_micros),'completed',sha);}
  catch(error){
   if((await this.pool.query('SELECT cancel_requested FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0]?.cancel_requested)
    return this.complete(id,directory);
   throw error;
  }
  await this.store.remove(payload.inputKey).catch(()=>{});
  return {id,state:'completed',outputId:saved.id,sha256:sha,modeledCostMicros:Number(row.actual_cost_micros),externalSpendMicros:0};
 }
 async run(renderer:string,directory:string){
  if(!isAbsolute(renderer)||!isAbsolute(directory))throw Error('Absolute renderer and work directory required');
  const recovery=(await this.pool.query(`SELECT reservation_id FROM generation_jobs WHERE worker_id='local_cpp'
   AND budget->'render'->'result' IS NOT NULL AND (state IN ('running','stopping') OR settled_at IS NULL)
   ORDER BY created_at LIMIT 1`)).rows[0];
  if(recovery){
   const current=(await this.pool.query('SELECT stop_confirmed_at FROM generation_jobs WHERE reservation_id=$1',[recovery.reservation_id])).rows[0];
   if(current.stop_confirmed_at){await this.queue.reconcile(recovery.reservation_id);return {id:recovery.reservation_id,state:'settled'};}
   return this.complete(recovery.reservation_id,directory);
  }
  const claim=await this.queue.claim('local_cpp',true);if(!claim)return null;
  const permit=verifyPermit(claim.permit,this.secret);
  const row=(await this.pool.query('SELECT owner_id,budget,cancel_requested FROM generation_jobs WHERE reservation_id=$1 AND lease_token=$2',[claim.id,claim.leaseToken])).rows[0];
  let child:ReturnType<typeof spawn>|undefined,exited:Promise<void>|undefined,timer:ReturnType<typeof setInterval>|undefined;
  let actual=0,started:number|undefined,receiptSaved=false;
  try{
   const payload=row.budget.render;
   if(!payload||!/^uploads\/[a-f0-9-]{36}\.wav$/.test(payload.inputKey))throw Error('Missing render payload');
   const source=await this.store.get(payload.inputKey,960044),v=input({source:source.toString('base64'),plan:payload.plan,title:payload.title,consent:true});
   if(v.inputSha256!==permit.inputSha256||v.planSha256!==permit.planSha256)throw Error('Worker payload identity mismatch');
   const folder=await mkdtemp(join(directory,'generation-')),prefix=join(folder,'result');
   await writeFile(join(folder,'source.wav'),source,{flag:'wx',mode:0o600});
   await writeFile(join(folder,'plan.json'),v.planText,{flag:'wx',mode:0o600});
   started=performance.now();
   try{await runBudgeted(permit,signal=>new Promise<void>((resolve,reject)=>{
    child=spawn(renderer,['--input',join(folder,'source.wav'),'--consent','--plan',join(folder,'plan.json'),'--style',v.plan.strategy,'--seed',String(v.plan.seed),'--output',prefix],{stdio:'ignore',env:{PATH:process.env.PATH,LANG:'C',NODE_ENV:'production'}});
    exited=new Promise<void>((done,fail)=>{child!.once('error',fail);child!.once('exit',()=>done());});exited.catch(()=>{});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Renderer stopped')));
    const stop=()=>{child?.kill('SIGKILL');reject(Error('Render cancelled or lease lost'));};
    signal.addEventListener('abort',stop,{once:true});
    timer=setInterval(()=>{void this.queue.heartbeat(claim.id,claim.leaseToken).then(ok=>{if(!ok)stop();},stop);},5000);
   }),async()=>{clearInterval(timer);if(child?.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exited;});
   }finally{actual=permit.fixedCostMicros+Math.ceil(permit.hourlyMicros*(performance.now()-started)/3600000);}
   if(actual>permit.costCapMicros)throw Error('Measured modeled cost exceeds reservation');
   if(!await this.queue.heartbeat(claim.id,claim.leaseToken))throw Error('Lease ended before publication');
   await readFile(prefix+'.complete.json');const path=prefix+'.'+v.plan.strategy+'.wav';
   if((await stat(path)).size>MAX_AUDIO_BYTES)throw Error('Output exceeds storage bound');
   const wav=await readFile(path),sha=hash(wav);validateWav(wav,wav.length,sha);
   const receipt=await this.pool.query(`UPDATE generation_jobs SET actual_cost_micros=$3,
    budget=jsonb_set(budget,'{render,result}',$4::jsonb) WHERE reservation_id=$1 AND lease_token=$2 AND state IN ('running','stopping')`,
    [claim.id,claim.leaseToken,actual,JSON.stringify({path:relative(directory,path),sha256:sha})]);
   if(!receipt.rowCount)throw Error('Unable to retain completion receipt');
   receiptSaved=true;
   return await this.complete(claim.id,directory);
  }catch(error){
   clearInterval(timer);
   const current=(await this.pool.query('SELECT state,cancel_requested FROM generation_jobs WHERE reservation_id=$1',[claim.id])).rows[0];
   if(!receiptSaved&&!['completed','failed','cancelled'].includes(current.state))await this.queue.stopped(claim.id,claim.leaseToken,actual,current.cancel_requested?'cancelled':'failed');
   throw error;
  }
 }
}
