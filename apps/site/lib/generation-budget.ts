import {createHmac,timingSafeEqual} from 'node:crypto';
import {integer} from './economics';

export type WorkerPermit={version:1;reservationId:string;inputSha256:string;planSha256:string;
 expiresAt:number;maxRuntimeMs:number;hourlyMicros:number;fixedCostMicros:number;costCapMicros:number;attempt:1};
export function validatePermit(p:WorkerPermit,now:number){
 if(p.version!==1||p.attempt!==1||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.reservationId)||
 !/^[0-9a-f]{64}$/.test(p.inputSha256)||!/^[0-9a-f]{64}$/.test(p.planSha256))throw new Error('Invalid worker identity');
 integer(p.expiresAt,now+1,now+3600000);integer(p.maxRuntimeMs,1,900000);
 integer(p.hourlyMicros,1,5_000_000);integer(p.fixedCostMicros);integer(p.costCapMicros,1,5_000_000);
 const variable=Number((BigInt(p.hourlyMicros)*BigInt(p.maxRuntimeMs)+3599999n)/3600000n);
 if(p.fixedCostMicros+variable>p.costCapMicros)throw new Error('Worker exceeds reserved cost cap');
}
export function signPermit(permit:WorkerPermit,secret:string,now=Date.now()){
 if(secret.length<32)throw new Error('Worker secret too short');validatePermit(permit,now);
 const body=Buffer.from(JSON.stringify(permit)).toString('base64url');
 return body+'.'+createHmac('sha256',secret).update(body).digest('hex');
}
export function verifyPermit(value:string,secret:string,now=Date.now()){
 if(secret.length<32||value.length>4096)throw new Error('Invalid worker authorization');
 const parts=value.split('.');if(parts.length!==2||!/^[0-9a-f]{64}$/.test(parts[1]))throw new Error('Invalid signature');
 const expected=createHmac('sha256',secret).update(parts[0]).digest();
 if(!timingSafeEqual(expected,Buffer.from(parts[1],'hex')))throw new Error('Invalid signature');
 const permit=JSON.parse(Buffer.from(parts[0],'base64url').toString()) as WorkerPermit;validatePermit(permit,now);return permit;
}
/** The adapter must confirm provider termination; aborting inference alone does not stop rental billing. */
export async function runBudgeted<T>(permit:WorkerPermit,run:(signal:AbortSignal)=>Promise<T>,terminate:()=>Promise<void>){
 validatePermit(permit,Date.now());const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([run(controller.signal),new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>{controller.abort();reject(new Error('Generation time/cost ceiling reached'));},Math.min(permit.maxRuntimeMs,permit.expiresAt-Date.now()));
 })]);}finally{clearTimeout(timer);controller.abort();await terminate();}
}
