import {readBody} from './audio-validation';

const states=['IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','TIMED_OUT'] as const;
export type RunpodState=typeof states[number];
export type RunpodJob={
 id:string;product:'music-dna'|'improvise';payload:Record<string,unknown>;output_url:string;timeout_seconds:number;
 source?:{url:string;bytes:number;sha256:string};
};
export type RunpodResult={id:string;status:RunpodState;output?:Record<string,unknown>;delayTime?:number;executionTime?:number};

export class RunpodProvider{
 constructor(private key:string,readonly endpoint:string,private request:typeof fetch=fetch){
  if(!key.trim()||! /^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))throw Error('Runpod configuration is incomplete');
 }
 private async api(path:string,method='GET',body?:unknown){
  try{
   const response=await this.request(`https://api.runpod.ai/v2/${this.endpoint}/${path}`,{method,
    headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok){await response.body?.cancel();throw Error('Provider request failed');}
   const value=JSON.parse((await readBody(response.body,524288)).toString());
   if(!value||typeof value!=='object'||Array.isArray(value)||value.error&&!['FAILED','CANCELLED','TIMED_OUT'].includes(value.status))throw Error('Invalid provider response');
   return value;
  }catch{throw Error(method==='POST'&&path==='run'?'Runpod submission is unconfirmed. Do not automatically resubmit; inspect the endpoint first.':'Runpod request failed');}
 }
 async submit(job:RunpodJob):Promise<RunpodResult>{
  if(!/^[a-f0-9]{32}$/.test(job.id)||!['music-dna','improvise'].includes(job.product)||
    !Number.isInteger(job.timeout_seconds)||job.timeout_seconds<5||job.timeout_seconds>900||
    Buffer.byteLength(JSON.stringify(job))>131072)throw Error('Invalid Runpod job');
  // A lost POST response may already have started paid work. Never retry submission here.
  return this.result(await this.api('run','POST',{input:job,policy:{executionTimeout:job.timeout_seconds*1000,ttl:1800000}}));
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
  return {id:value.id,status:value.status as RunpodState,...(value.output?{output:value.output as Record<string,unknown>}:{}),
   ...(value.delayTime===undefined?{}:{delayTime:Number(value.delayTime)}),...(value.executionTime===undefined?{}:{executionTime:Number(value.executionTime)})};
 }
}
