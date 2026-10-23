import {readBody} from './audio-validation';

const states=['IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','TIMED_OUT'] as const;
export type RunpodState=typeof states[number];
export type RunpodJob={
 id:string;product:'music-dna'|'improvise';payload:Record<string,unknown>;output_url:string;timeout_seconds:number;
 source?:{url:string;bytes:number;sha256:string};ttl_seconds?:number;
};
export type RunpodResult={id:string;status:RunpodState;output?:Record<string,unknown>;delayTime?:number;executionTime?:number;failure?:string};

export class RunpodMissingJob extends Error{constructor(){super('Provider job is no longer available');}}

export class RunpodProvider{
 constructor(private key:string,readonly endpoint:string,private request:typeof fetch=fetch){
  if(!key.trim()||! /^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))throw Error('Runpod configuration is incomplete');
 }
 private async api(path:string,method='GET',body?:unknown){
  try{
   const response=await this.request(`https://api.runpod.ai/v2/${this.endpoint}/${path}`,{method,
    headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok){await response.body?.cancel();if(method==='GET'&&path.startsWith('status/')&&response.status===404)throw new RunpodMissingJob();throw Error('Provider HTTP '+response.status);}
   const value=JSON.parse((await readBody(response.body,16*1024*1024)).toString());
   if(!value||typeof value!=='object'||Array.isArray(value)||value.error&&!['FAILED','CANCELLED','TIMED_OUT'].includes(value.status))throw Error('Invalid provider response');
   return value;
  }catch(error){if(error instanceof RunpodMissingJob)throw error;const status=error instanceof Error&&/^Provider HTTP [0-9]{3}$/.test(error.message)?' ('+error.message+')':'';throw Error((method==='POST'&&path==='run'?'Runpod submission is unconfirmed. Do not automatically resubmit; inspect the endpoint first.':'Runpod request failed')+status);}
 }
 async dispatchEnabled(){
  const response=await this.request(`https://api.runpod.io/v2/serverless/${this.endpoint}`,{headers:{Authorization:`Bearer ${this.key}`},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok){await response.body?.cancel();throw Error('Song capacity could not be checked');}
  const value=JSON.parse((await readBody(response.body,16*1024*1024)).toString());
  if(value?.id!==this.endpoint||!Number.isSafeInteger(value.workers?.max)||value.workers.max<0)throw Error('Invalid song capacity receipt');
  return value.workers.max>0;
 }
 async submit(job:RunpodJob):Promise<RunpodResult>{
  if(!/^[a-f0-9]{32}$/.test(job.id)||!['music-dna','improvise'].includes(job.product)||
    !Number.isInteger(job.timeout_seconds)||job.timeout_seconds<5||job.timeout_seconds>900||
    Buffer.byteLength(JSON.stringify({input:job,policy:{executionTimeout:job.timeout_seconds*1000,ttl:(job.ttl_seconds??1800)*1000}}))>10_000_000||job.ttl_seconds!==undefined&&(!Number.isInteger(job.ttl_seconds)||job.ttl_seconds<job.timeout_seconds||job.ttl_seconds>1800))throw Error('Invalid Runpod job');
  // A lost POST response may already have started paid work. Never retry submission here.
  return this.result(await this.api('run','POST',{input:job,policy:{executionTimeout:job.timeout_seconds*1000,ttl:(job.ttl_seconds??1800)*1000}}));
 }
 async status(id:string){this.id(id);return this.result(await this.api('status/'+id),id);}
 async cancel(id:string){this.id(id);return this.result(await this.api('cancel/'+id,'POST'),id);}
 async health(){return this.api('health');}
 private id(id:string){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw Error('Invalid provider job ID');}
 private result(value:Record<string,unknown>,expected?:string):RunpodResult{
  this.id(String(value.id??''));
  if(typeof value.id!=='string'||expected&&value.id!==expected||!states.includes(value.status as RunpodState))throw Error('Invalid provider job receipt');
  for(const name of ['delayTime','executionTime'])if(value[name]!==undefined&&(!Number.isSafeInteger(value[name])||Number(value[name])<0))throw Error('Invalid provider timing');
  if(value.status==='COMPLETED'&&(!value.output||typeof value.output!=='object'||Array.isArray(value.output)))throw Error('Missing worker receipt');
  // Retain only our static diagnostic grammar; raw provider errors may contain private lyrics or URLs.
  const failure=value.status==='FAILED'&&typeof value.error==='string'&&value.error.length<2048
   ?value.error.match(/Jamloom generation failed at (style-rejected(?::matched-[0-4]-of-4)?|(?:writing|composing|retrying|checking)-(?:timeout|exit--?[0-9]{1,3})|worker-timeout|(?:fit(?:-retry)?|singer|planner|private)@(?:[A-Za-z_]+\.py:[0-9]{1,5}|unavailable)); no completed song was accepted\./)?.[1]:undefined;
  return {id:value.id,status:value.status as RunpodState,...(value.output?{output:value.output as Record<string,unknown>}:{}),
   ...(failure?{failure}:{}),
   ...(value.delayTime===undefined?{}:{delayTime:Number(value.delayTime)}),...(value.executionTime===undefined?{}:{executionTime:Number(value.executionTime)})};
 }
}
