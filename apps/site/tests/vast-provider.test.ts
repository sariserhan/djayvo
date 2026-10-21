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
