import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('Runpod provisioning corrects provider defaults, allows newer drivers, and refuses active endpoints',()=>{
 for(const mode of ['new','active','renamed']){
  const active=mode==='active',existing=mode==='renamed';
  const script=`
   import assert from 'node:assert/strict';
   process.argv.push('--apply');
   process.env.RUNPOD_API_KEY='fixture';
   process.env.RUNPOD_WORKER_IMAGE='ghcr.io/fixture/worker@sha256:'+'a'.repeat(64);
   process.env.R2_ACCOUNT_ID='a'.repeat(32);process.env.R2_BUCKET='fixture-audio';
   let endpoint=${existing}?{id:'endpoint',name:'jamloom-music-v1',templateId:'template',workersMin:0,workersMax:0}:undefined,patches=0;
   globalThis.fetch=async(url,init)=>{
    const path=new URL(url).pathname,body=init.body&&JSON.parse(init.body);
    if(path==='/v1/templates')return Response.json([{id:'template',name:${existing}?'jamloom-music-v1-template':'jamloom-music-v1',imageName:process.env.RUNPOD_WORKER_IMAGE,
     env:{JAMLOOM_R2_ORIGIN:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',JAMLOOM_R2_BUCKET:'fixture-audio'}}]);
    if(path==='/v1/endpoints'&&init.method==='GET')return Response.json(${active}?[{name:'jamloom-music-v1',templateId:'template',workersMin:1,workersMax:1}]:endpoint?[endpoint]:[]);
    if(path==='/v1/endpoints'&&init.method==='POST'){
     assert.equal(body.workersMin,0);assert.equal(body.workersMax,0);
     endpoint={...body,id:'endpoint',workersMax:3};return Response.json(endpoint);
    }
    if(path==='/v1/endpoints/endpoint'){
     if(init.method==='PATCH'){patches++;assert.deepEqual(body,{workersMin:0,workersMax:0});Object.assign(endpoint,body);}
     return Response.json(endpoint);
    }
    if(path==='/v2/serverless/endpoint'&&init.method==='PATCH'){
     patches++;assert.equal(endpoint.workersMax,0);
     assert.deepEqual(body,{gpu:{allowedCudaVersions:[],minCudaVersion:'12.8'}});return Response.json(body);
    }
    throw Error('Unexpected request: '+path);
   };
   if(${active}){await assert.rejects(import('../scripts/runpod-setup.ts'),/active/);assert.equal(patches,0);}
   else{await import('../scripts/runpod-setup.ts');assert.equal(patches,${existing}?1:2);assert.equal(endpoint.workersMax,0);}
  `;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{cwd:new URL('.',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
 }
});
