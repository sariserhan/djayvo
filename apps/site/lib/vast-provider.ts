import {integer} from './economics';
import {readBody} from './audio-validation';

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
}
