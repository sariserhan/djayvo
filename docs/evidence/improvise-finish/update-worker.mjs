// Run from the repo root; a disabled endpoint and reviewed digest are mandatory.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
process.loadEnvFile('apps/site/.env.local');
const image=process.argv[2];assert(/^ghcr\.io\/sariserhan\/jamloom\/music-worker@sha256:[a-f0-9]{64}$/.test(image));
const previous=JSON.parse(readFileSync('docs/evidence/improvise-finish/endpoint-before.json','utf8'));
const headers={Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'};
async function api(path,method='GET',body){const r=await fetch('https://rest.runpod.io/v1/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});assert(r.ok,`Runpod ${method} HTTP ${r.status}`);return r.json();}
const endpoint=await api('endpoints/'+previous.endpoint);assert.equal(endpoint.workersMin,0);assert.equal(endpoint.workersMax,0);assert.equal(endpoint.templateId,previous.template);
const before=await api('templates/'+previous.template+'?includeEndpointBoundTemplates=true');assert([previous.image,image].includes(before.imageName),'Unexpected image; inspect concurrent changes');
if(!process.argv.includes('--apply')){console.log({mode:'dry-run',endpoint:previous.endpoint,from:before.imageName,to:image,workers:0});process.exit(0);}
await api('templates/'+previous.template,'PATCH',{imageName:image});
const after=await api('templates/'+previous.template+'?includeEndpointBoundTemplates=true');assert.equal(after.imageName,image);assert.deepEqual(after.env,before.env);assert.equal(after.containerDiskInGb,before.containerDiskInGb);
const verified=await api('endpoints/'+previous.endpoint);assert.equal(verified.workersMin,0);assert.equal(verified.workersMax,0);
const receipt={endpoint:previous.endpoint,template:previous.template,previousImage:before.imageName,image,workersMin:0,workersMax:0,environmentPreserved:true,websiteDeployment:false};
writeFileSync('docs/evidence/improvise-finish/worker-update.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt);
