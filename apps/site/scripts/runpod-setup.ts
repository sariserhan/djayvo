import './env';
import {readBody} from '../lib/audio-validation';

const image=process.env.RUNPOD_WORKER_IMAGE,account=process.env.R2_ACCOUNT_ID,bucket=process.env.R2_BUCKET;
if(!image||!/^ghcr\.io\/[a-z0-9_.\/-]+@sha256:[a-f0-9]{64}$/.test(image))throw Error('Set RUNPOD_WORKER_IMAGE to the built ghcr.io image digest');
if(!account||!/^[a-f0-9]{32}$/.test(account)||!bucket||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw Error('R2 target is incomplete');
const name='jamloom-music-v1';
const template={name,imageName:image,isPublic:false,isServerless:true,containerDiskInGb:60,
 env:{JAMLOOM_R2_ORIGIN:`https://${account}.r2.cloudflarestorage.com`,JAMLOOM_R2_BUCKET:bucket},
 ...(process.env.RUNPOD_REGISTRY_AUTH_ID?{containerRegistryAuthId:process.env.RUNPOD_REGISTRY_AUTH_ID}:{})};
// Disabled until the image and a capped real generation are reviewed. No always-on GPU.
const endpoint={name,computeType:'GPU',gpuCount:1,gpuTypeIds:['NVIDIA GeForce RTX 4090'],
 allowedCudaVersions:['12.8','12.9','13.0'],workersMin:0,workersMax:0,idleTimeout:5,executionTimeoutMs:900000,flashboot:true,scalerType:'QUEUE_DELAY',scalerValue:4};
if(!process.argv.includes('--apply'))console.log({template,endpoint,mode:'dry-run; no provider changes'});
else{
 const key=process.env.RUNPOD_API_KEY;if(!key)throw Error('RUNPOD_API_KEY is missing; store it in .env.local, never in chat');
 async function api(path:string,method='GET',body?:unknown){
  const response=await fetch('https://rest.runpod.io/v1/'+path,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok){await response.body?.cancel();throw Error(`Runpod setup returned HTTP ${response.status}; inspect existing resources before retrying`);}
  return JSON.parse((await readBody(response.body,1048576)).toString());
 }
 const templates=await api('templates');if(!Array.isArray(templates))throw Error('Unexpected template inventory');
 const matching=templates.filter(t=>t.name===name);if(matching.length>1)throw Error('Duplicate template names; inspect the account');
 let saved=matching[0];
 if(saved&&(saved.imageName!==image||saved.env?.JAMLOOM_R2_ORIGIN!==template.env.JAMLOOM_R2_ORIGIN||saved.env?.JAMLOOM_R2_BUCKET!==bucket))throw Error('Existing template differs; refusing to replace it');
 saved??=await api('templates','POST',template);
 if(typeof saved.id!=='string')throw Error('Template creation is unconfirmed; inspect before retrying');
 const endpoints=await api('endpoints');if(!Array.isArray(endpoints))throw Error('Unexpected endpoint inventory');
 const matches=endpoints.filter(e=>e.name===name);if(matches.length>1)throw Error('Duplicate endpoint names; inspect the account');
 let deployed=matches[0];
 if(deployed&&(deployed.templateId!==saved.id||deployed.workersMin!==0||deployed.workersMax!==0))throw Error('Existing endpoint differs or is active; refusing to replace it');
 deployed??=await api('endpoints','POST',{...endpoint,templateId:saved.id});
 const verified=await api('endpoints/'+encodeURIComponent(deployed.id));
 if(verified.templateId!==saved.id||verified.workersMin!==0||verified.workersMax!==0)throw Error('Disabled endpoint verification failed');
 console.log({endpoint:verified.id,template:saved.id,workersMin:0,workersMax:0,status:'configured, disabled; no generation submitted'});
}
