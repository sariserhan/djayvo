import './env';
import assert from 'node:assert/strict';
import {RunpodProvider} from '../lib/runpod-provider';
const endpoint=process.env.RUNPOD_ENDPOINT_ID,key=process.env.RUNPOD_API_KEY;
assert(endpoint&&/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint)&&key,'Runpod configuration required');
const get=async(path:string)=>{const r=await fetch('https://api.runpod.io/v2/'+path,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});assert(r.ok,'Provider audit failed: '+r.status);return r.json();};
const [config,billing,health]=await Promise.all([get('serverless/'+endpoint),get('billing/serverless?serverlessId='+endpoint+'&bucketSize=hour&lastN=24'),new RunpodProvider(key,endpoint).health()]);
assert.equal(config.id,endpoint);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),endpoint,image:config.image,workers:config.workers,scaling:config.scaling,health,billing},null,2));
