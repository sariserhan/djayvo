// Owner approved one extra request, $3, one worker and 20 minutes on 2026-10-23.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const root=new URL('../../../',import.meta.url),plan=JSON.parse(readFileSync(new URL('./reggae-diagnostic-plan.json',import.meta.url)));
if(!process.argv.includes('--apply')){console.log(plan);process.exit(0);}
process.loadEnvFile(new URL('apps/site/.env.local',root));
const prior=JSON.parse(readFileSync(new URL('../improvise-finish/endpoint-before.json',import.meta.url)));
const headers={Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'};
async function api(path,method='GET',body){const response=await fetch('https://rest.runpod.io/v1/'+path,{method,headers,redirect:'error',signal:AbortSignal.timeout(15000),...(body?{body:JSON.stringify(body)}:{})});assert(response.ok,`Provider control HTTP ${response.status}`);return response.json();}
const endpoint=await api('endpoints/'+prior.endpoint);assert.equal(endpoint.workersMin,0);assert.equal(endpoint.workersMax,0);assert.equal(endpoint.templateId,prior.template);
const before=await api('templates/'+prior.template+'?includeEndpointBoundTemplates=true');assert.equal(before.imageName,prior.image);
const receipt={approval:'Owner approved this capped diagnostic test',startedAt:new Date().toISOString(),endpoint:prior.endpoint,image:plan.image,previousImage:prior.image,maxUSD:3,requests:1,restored:false};
const save=()=>writeFileSync(new URL('./reggae-diagnostic-execution.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');save();
let changed=false;
try{
 changed=true;await api('templates/'+prior.template,'PATCH',{imageName:plan.image});
 const updated=await api('templates/'+prior.template+'?includeEndpointBoundTemplates=true');assert.equal(updated.imageName,plan.image);assert.deepEqual(updated.env,before.env);
 const child=spawn(process.execPath,['--import','tsx','scripts/cloud-song-trial.ts','--reggae-diagnostic','--source','../../'+plan.source,'--apply'],{cwd:new URL('apps/site/',root),env:{...process.env,JAMLOOM_TEST_DATABASE_URL:'postgresql://serhansari@127.0.0.1:5432/postgres',JAMLOOM_TRIAL_IMAGE:plan.image},stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});receipt.exitCode=code;save();if(code!==0)process.exitCode=1;
}finally{
 if(changed){
  await api('endpoints/'+prior.endpoint,'PATCH',{workersMin:0,workersMax:0});
  const stopped=await api('endpoints/'+prior.endpoint);assert.equal(stopped.workersMin,0);assert.equal(stopped.workersMax,0);
  const current=await api('templates/'+prior.template+'?includeEndpointBoundTemplates=true');assert([prior.image,plan.image].includes(current.imageName));assert.deepEqual(current.env,before.env);
  await api('templates/'+prior.template,'PATCH',{imageName:prior.image});
  const restored=await api('templates/'+prior.template+'?includeEndpointBoundTemplates=true');assert.equal(restored.imageName,prior.image);assert.deepEqual(restored.env,before.env);
  receipt.restored=true;receipt.workersMin=0;receipt.workersMax=0;receipt.environmentPreserved=true;
 }
 receipt.finishedAt=new Date().toISOString();save();console.log(JSON.stringify(receipt));
}
