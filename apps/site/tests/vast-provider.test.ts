import test from 'node:test';import assert from 'node:assert/strict';
import {VastProvider} from '../lib/vast-provider';

const page=(instances:unknown[],next_token:string|null=null,total_instances=instances.length)=>({success:true,instances,instances_found:instances.length,total_instances,next_token});
test('Vast adapter verifies account, traverses complete inventory, limits returned fields and confirms delete response',async()=>{
 const calls:{url:string;options:RequestInit|undefined}[]=[];
 const mock:typeof fetch=async(input,options)=>{
  const url=String(input);calls.push({url,options});
  if(url.endsWith('/users/current'))return Response.json({id:42,email:'private@example.test'});
  if(options?.method==='DELETE')return Response.json({success:true});
  if(url.includes('after_token='))return Response.json(page([{id:8,label:null,ssh_token:'not returned'}],null,2));
  return Response.json(page([{id:7,label:'job'}],'next+/=',2));
 };
 const api=new VastProvider('fixture-secret',mock);
 assert.deepEqual(await api.inventory(42),[{id:7,label:'job'},{id:8,label:null}]);await api.destroy(7);
 assert.equal(calls.length,4);assert.equal(new URL(calls[2].url).searchParams.get('after_token'),'next+/=');
 assert.ok(calls.every(c=>c.options?.redirect==='error'&&c.options?.signal));
 assert.ok(calls.every(c=>new Headers(c.options?.headers).get('Authorization')==='Bearer fixture-secret'));
 assert.equal(calls[3].url,'https://console.vast.ai/api/v0/instances/7');
 await assert.rejects(api.inventory(43),/account mismatch/);
});
test('invalid, incomplete, changing or cyclic inventory is never interpreted as absence',async()=>{
 const invalid=[{},page([],null,1),{...page([]),next_token:undefined},{...page([]),success:false},
  page([{id:1,label:null},{id:1,label:null}]),page([{id:'7',label:'job'}]),page([{id:7}]),
  {...page([]),instances_found:1},page([],'repeat',1)];
 for(const result of invalid){
  const api=new VastProvider('fixture',async input=>Response.json(String(input).endsWith('/users/current')?{id:42}:result));
  await assert.rejects(api.inventory(42));
 }
 let pages=0;const api=new VastProvider('fixture',async input=>Response.json(String(input).endsWith('/users/current')?{id:42}:
  pages++===0?page([{id:1,label:null}],'next',2):page([{id:2,label:null}],null,3)));
 await assert.rejects(api.inventory(42),/changed/);
});
test('provider failures, body size and error text cannot leak secrets or prove destruction',async()=>{
 for(const mock of [async()=>new Response('secret response',{status:403}),async()=>{throw new Error('fixture-secret');},
  async()=>Response.json({success:false,msg:'fixture-secret'}),async()=>new Response('a'.repeat(1_048_577)),
  async()=>Response.json({})]){
  const api=new VastProvider('fixture-secret',mock);
  await assert.rejects(api.destroy(3),error=>error instanceof Error&&!error.message.includes('fixture-secret'));
 }
 await assert.rejects(new VastProvider('fixture').destroy(-3),/bounded/);
});

test('provider billing verifies identity and complete pagination, rounds costs up and never asserts finality',async()=>{
 const label='jamloom-job-11111111-1111-1111-1111-111111111111';
 const charge={start:100,end:200,type:'instance',source:'instance-77',amount:'0.0123451',metadata:{label},items:[{type:'gpu',amount:.01}]};
 const response={success:true,count:1,total:1,next_token:null,results:[charge]};
 const api=new VastProvider('fixture',async input=>{const url=new URL(String(input));if(url.pathname.endsWith('/users/current'))return Response.json({id:42});assert.equal(url.pathname,'/api/v0/charges');assert.deepEqual(JSON.parse(url.searchParams.get('select_filters')!),{day:{gte:0,lte:300},type:{in:['instance']}});return Response.json(response);});
 const result=await api.charges(42,77,label,0,300);assert.equal(result.observedCostMicros,12346);assert.equal(result.final,false);assert.match(result.evidenceSha256,/^[a-f0-9]{64}$/);
 for(const patch of [{amount:-1},{amount:'NaN'},{source:'instance-78'},{start:-1},{end:301},{metadata:{label:'other'}}]){
  const invalid=new VastProvider('fixture',async input=>Response.json(String(input).endsWith('/users/current')?{id:42}:{...response,results:[{...charge,...patch}]}));await assert.rejects(invalid.charges(42,77,label,0,300));
 }
 for(const patch of [{total:2},{count:2},{next_token:'repeated'}]){
  const invalid=new VastProvider('fixture',async input=>Response.json(String(input).endsWith('/users/current')?{id:42}:{...response,...patch}));await assert.rejects(invalid.charges(42,77,label,0,300));
 }
});
