import './env';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {r2AudioStore} from '../lib/audio-store';
import {RunpodProvider,type RunpodJob} from '../lib/runpod-provider';

const product=process.argv[process.argv.indexOf('--product')+1];
assert(product==='music-dna'||product==='improvise','Choose --product music-dna or improvise');
const key=process.env.RUNPOD_API_KEY,endpoint=process.env.RUNPOD_ENDPOINT_ID;
assert(key&&endpoint&&/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint),'Runpod configuration missing');
const sourceIndex=process.argv.indexOf('--source');
assert(product!=='improvise'||sourceIndex>=0,'Improvise needs an explicitly permitted --source WAV');
const directory=resolve('../../build-runpod',product);
if(!process.argv.includes('--apply')){
 console.log({product,endpoint,mode:'dry-run',maxWorkers:1,executionSeconds:900,wallSeconds:1200,
  limit:'Runtime bounds, not a guaranteed provider dollar cap. No customer credits used.'});
}else{
 await mkdir(directory,{recursive:true,mode:0o700});
 // An existing receipt blocks accidental repeat spending, including an ambiguous first POST.
 const statePath=join(directory,'trial.json');
 const id=randomUUID().replaceAll('-',''),outputKey=`uploads/${randomUUID()}.wav`,sourceKey=`uploads/${randomUUID()}.wav`;
 const state:{[key:string]:unknown}={id,product,endpoint,outputKey,sourceKey,phase:'preflight',startedAt:new Date().toISOString()};
 await writeFile(statePath,JSON.stringify(state,null,2),{flag:'wx',mode:0o600});
 const save=async()=>writeFile(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
 async function control(method:string,body?:unknown){
  const response=await fetch(`https://rest.runpod.io/v1/endpoints/${endpoint}`,{method,
   headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Endpoint control failed: HTTP ${response.status}`);
  return response.json();
 }
 const config=await control('GET');
 assert(config.name==='jamloom-music-v1'&&config.workersMin===0&&config.workersMax===0,'Trial requires the disabled Jamloom endpoint');
 const store=r2AudioStore(),provider=new RunpodProvider(key,endpoint);
 let providerId:string|undefined,terminal=false,enabled=false;
 try{
  const job:RunpodJob={id,product,timeout_seconds:900,
   output_url:await store.uploadURL(outputKey,(product==='music-dna'?120:30)*48000*4+44,3600),
   payload:product==='music-dna'?{seed:61023,profile:{references:['Feeling Good — Nina Simone','Cantaloupe Island — Herbie Hancock'],
    referenceMetadata:[{reference:'Feeling Good — Nina Simone',genre:'Jazz'},{reference:'Cantaloupe Island — Herbie Hancock',genre:'Jazz'}],vocalLanguage:'en'}}:
    {phrase:'I have a question',voice:'female',genre:'funk',consent:true}};
  if(product==='improvise'){
   const bytes=await readFile(resolve(process.argv[sourceIndex+1]));
   assert(bytes.length>=44&&bytes.length<=24_000_000&&bytes.toString('ascii',0,4)==='RIFF','Use a bounded consented WAV');
   await store.put(sourceKey,bytes);
   job.source={url:await store.playbackURL(sourceKey,false,3600),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  const started=Date.now();
  enabled=true;await control('PATCH',{workersMin:0,workersMax:1});
  state.phase='submitting';await save();
  const submitted=await provider.submit(job);providerId=submitted.id;
  state.providerId=providerId;state.phase='queued';await save();
  while(Date.now()-started<1200000){
   const result=await provider.status(providerId);
   console.log({product,status:result.status,elapsedSeconds:Math.round((Date.now()-started)/1000)});
   if(result.status==='COMPLETED'){
    terminal=true;const output=result.output!;
    assert(output.schema==='jamloom-runpod-1'&&output.id===id&&output.product===product,'Worker identity mismatch');
    assert(output.audio_bytes===(product==='music-dna'?120:30)*48000*4+44&&typeof output.audio_sha256==='string','Worker audio receipt invalid');
    const audio=await store.get(outputKey,24_000_000);
    assert.equal(createHash('sha256').update(audio).digest('hex'),output.audio_sha256);
    await writeFile(join(directory,'song.wav'),audio,{flag:'wx',mode:0o600});
    await writeFile(join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
    state.phase='completed';state.audioSha256=output.audio_sha256;state.executionMs=result.executionTime;state.delayMs=result.delayTime;await save();
    break;
   }
   if(['FAILED','CANCELLED','TIMED_OUT'].includes(result.status)){terminal=true;throw Error('GPU job did not complete');}
   await new Promise(r=>setTimeout(r,20000));
  }
  assert.equal(state.phase,'completed','Trial wall time exceeded');
 }catch(error){state.phase='failed';state.failure=error instanceof assert.AssertionError?error.message:'Trial failed; inspect provider status before any repeat';await save();throw error;}
 finally{
  if(providerId&&!terminal)try{state.cancellation=await provider.cancel(providerId);}catch{state.cancellation='UNCONFIRMED';}
  if(enabled)try{await control('PATCH',{workersMin:0,workersMax:0});const stopped=await control('GET');assert(stopped.workersMin===0&&stopped.workersMax===0);state.disabled=true;}catch{state.disabled=false;}
  try{await store.remove(outputKey);await store.remove(sourceKey);state.stagingRemoved=true;}catch{state.stagingRemoved=false;}
  state.finishedAt=new Date().toISOString();await save();
  console.log({product,phase:state.phase,disabled:state.disabled,stagingRemoved:state.stagingRemoved,directory});
  if(enabled&&!state.disabled)throw Error('Endpoint shutdown unconfirmed; inspect Runpod immediately');
 }
}
