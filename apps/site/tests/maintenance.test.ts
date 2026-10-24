import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenance} from '../lib/maintenance';

test('scheduled cleanup requires authorization, reviewed database target and production environment',async()=>{
 const secret='x'.repeat(32),env={CRON_SECRET:secret,JAMLOOM_CLEANUP_TARGET:'127.0.0.1:5432/fixture'};
 const calls:string[]=[];
 const getServices=()=>({config:{databaseURL:'postgresql://fixture@127.0.0.1:5432/fixture'},
  pool:{query:async()=>{calls.push('auth');return {rowCount:1};}},
  audio:{cleanup:async()=>{calls.push('audio');return {checked:1,cleaned:1,failed:0};}}}) as any;
 const request=(token=secret)=>new Request('https://jamloom.test/api/maintenance',{headers:{authorization:`Bearer ${token}`}});
 assert.equal((await maintenance(request(),getServices,{})).status,503);
 assert.equal((await maintenance(request('wrong'),getServices,env)).status,401);
 for(const extra of [{JAMLOOM_CLEANUP_TARGET:''},{JAMLOOM_CLEANUP_TARGET:'another/database'},{VERCEL:'1',VERCEL_ENV:'preview'}])
  assert.equal((await maintenance(request(),getServices,{...env,...extra})).status,503);
 assert.deepEqual(calls,[]);
 const response=await maintenance(request(),getServices,{...env,VERCEL:'1',VERCEL_ENV:'production'});
 assert.equal(response.status,200);assert.deepEqual(calls,['auth','auth','audio']);
 assert.deepEqual(await response.json(),{auth:{session:1,verification:1},audio:{checked:1,cleaned:1,failed:0}});
 const failed=()=>({...getServices(),audio:{cleanup:async()=>({checked:1,cleaned:0,failed:1})}});
 assert.equal((await maintenance(request(),failed,env)).status,503);
 const unavailable=()=>{throw Error('private database connection detail');};
 const error=await maintenance(request(),unavailable,env);assert.equal(error.status,503);
 assert.equal(await error.text(),'{"error":"Maintenance needs retry"}');
});

test('retention validates storage before deleting auth records when public uploads are disabled',async()=>{
 const secret='x'.repeat(32),env={CRON_SECRET:secret,JAMLOOM_CLEANUP_TARGET:'127.0.0.1:5432/fixture'};
 let queries=0;
 const getServices=()=>({config:{databaseURL:'postgresql://fixture@127.0.0.1:5432/fixture'},pool:{query:async()=>{queries++;return {rows:[],rowCount:0};}},audio:null}) as any;
 const request=new Request('https://jamloom.test/api/maintenance',{headers:{authorization:`Bearer ${secret}`}});
 assert.equal((await maintenance(request,getServices,env)).status,503);assert.equal(queries,0);
 const configured={...env,R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'test',R2_BUCKET:'fixture'};
 const response=await maintenance(request,getServices,configured);
 assert.equal(response.status,200);assert(queries>0);
 assert.deepEqual((await response.json()).audio,{checked:0,cleaned:0,failed:0});
});
