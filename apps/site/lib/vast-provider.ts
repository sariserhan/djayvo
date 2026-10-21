import {integer} from './economics';
import {readBody} from './audio-validation';
import {createHash} from 'node:crypto';

export type RentalInstance={id:number;label:string|null};
export interface RentalProvider {
 inventory(account:number):Promise<RentalInstance[]>;
 destroy(instance:number):Promise<void>;
}

// This adapter can inspect/destroy existing rentals; it cannot create paid instances.
export class VastProvider implements RentalProvider {
 constructor(private key:string,private request:typeof fetch=fetch){
  if(!key.trim())throw new Error('Vast key missing');
 }
 private async api(path:string,method='GET'){
  try{
   const response=await this.request('https://console.vast.ai/api/'+path,{method,
    headers:{Authorization:'Bearer '+this.key},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok){await response.body?.cancel();throw new Error('Request failed');}
   const body=JSON.parse((await readBody(response.body,1_048_576)).toString());
   if(!body||typeof body!=='object'||Array.isArray(body)||body.success===false)throw new Error('Invalid response');
   return body;
  }catch{throw new Error('Vast request failed or returned invalid data');}
 }
 async inventory(account:number):Promise<RentalInstance[]>{
  integer(account,1);const user=await this.api('v0/users/current');
  if(user.id!==account)throw new Error('Vast account mismatch');
  const instances:RentalInstance[]=[],ids=new Set<number>(),tokens=new Set<string>();
  let token:string|null=null,total:number|undefined;
  for(let page=0;page<40;page++){
   const params=new URLSearchParams({limit:'25',select_cols:JSON.stringify(['id','label'])});
   if(token)params.set('after_token',token);
   const result=await this.api('v1/instances?'+params);
   if(result.success!==true||!Array.isArray(result.instances)||result.instances.length>25||
    result.instances_found!==result.instances.length||!Number.isSafeInteger(result.total_instances)||
    result.total_instances<0||result.total_instances>1000||
    !(result.next_token===null||typeof result.next_token==='string'&&result.next_token.length>0&&result.next_token.length<=4096))
    throw new Error('Incomplete Vast inventory');
   total??=result.total_instances;
   if(result.total_instances!==total)throw new Error('Vast inventory changed; retry reconciliation');
   for(const item of result.instances){
    if(!item||!Number.isSafeInteger(item.id)||item.id<=0||ids.has(item.id)||
      !(item.label===null||typeof item.label==='string'&&item.label.length<=1024))throw new Error('Invalid Vast instance');
    ids.add(item.id);instances.push({id:item.id,label:item.label});
   }
   token=result.next_token;
   if(token===null){if(instances.length!==total)throw new Error('Incomplete Vast inventory');return instances;}
   if(tokens.has(token))throw new Error('Repeated Vast inventory cursor');tokens.add(token);
  }
  throw new Error('Vast inventory page limit reached');
 }
 async destroy(instance:number){
  integer(instance,1);
  if((await this.api('v0/instances/'+instance,'DELETE')).success!==true)throw new Error('Vast destroy unconfirmed');
 }
 async charges(account:number,instance:number,label:string,from:number,to:number){
  integer(account,1);integer(instance,1);integer(from,0);integer(to,from+1);
  if(to-from>32*86400||!/^jamloom-job-[a-f0-9-]{36}$/.test(label))throw Error('Invalid billing window or label');
  if((await this.api('v0/users/current')).id!==account)throw Error('Vast account mismatch');
  const rows:Record<string,unknown>[]=[],seen=new Set<string>(),sources=new Set<string>();let token:string|null=null,total:number|undefined;
  for(let page=0;page<40;page++){
   const params=new URLSearchParams({limit:'25',format:'table',select_filters:JSON.stringify({day:{gte:from,lte:to},type:{in:['instance']}})});
   if(token)params.set('after_token',token);
   const result=await this.api('v0/charges?'+params);
   if(result.success!==true||!Array.isArray(result.results)||result.results.length>25||result.count!==result.results.length||
     !Number.isSafeInteger(result.total)||result.total<0||result.total>1000||!(result.next_token===null||typeof result.next_token==='string'&&result.next_token.length>0&&result.next_token.length<=4096))throw Error('Incomplete provider charges');
   total??=result.total;if(total!==result.total)throw Error('Provider charges changed; retry');
   for(const row of result.results){
    if(!row||row.type!=='instance'||typeof row.source!=='string'||sources.has(row.source))throw Error('Invalid or repeated charge contract');
    sources.add(row.source);
    if(row.source===`instance-${instance}`){
     if(row.metadata?.label!==label||!Number.isFinite(row.start)||!Number.isFinite(row.end)||row.start<from||row.end>to||row.end<row.start)throw Error('Provider billing identity/window mismatch');
     rows.push(row);
    }
   }
   token=result.next_token;
   if(token===null){if(sources.size!==total||rows.length!==1)throw Error('Missing or incomplete instance charge evidence');break;}
   if(seen.has(token)||page===39)throw Error('Provider charge pagination limit');seen.add(token);
  }
  const row=rows[0],amount=String(row.amount);
  if(!/^\d{1,7}(\.\d{1,12})?$/.test(amount))throw Error('Unsupported provider charge amount');
  const [whole,fraction='']=amount.split('.'),scale=10n**BigInt(fraction.length);
  const micros=(BigInt(whole)*scale+BigInt(fraction||'0'))*1000000n;
  const observedCostMicros=Number((micros+scale-1n)/scale);integer(observedCostMicros);
  const evidence={account,instance,label,from,to,charge:row};
  return {observedCostMicros,evidence,evidenceSha256:createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),final:false as const};
 }
}
