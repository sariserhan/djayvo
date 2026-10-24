import './env';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {emptyTaste} from '../lib/taste';
import {r2AudioStore} from '../lib/audio-store';
import {DnaCommerce} from '../lib/dna-commerce';
import {CloudSongs,checkSource} from '../lib/cloud-songs';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {allocateCredits} from '../lib/economics';

const diagnostic=process.argv.includes('--reggae-diagnostic');
const improvise=diagnostic||process.argv.includes('--improvise-completion');
const repair=process.argv.includes('--repair'),startup=process.argv.includes('--startup'),completion=process.argv.includes('--dna-completion'),maxUSD=completion?3:startup?1:repair?2:3,maxWorkers=repair||startup||completion||improvise?1:2,maxSeconds=completion||improvise?1200:startup?720:repair?900:780;
assert([repair,startup,completion,improvise].filter(Boolean).length<=1,'Choose one trial');
const stamp=new Date().toISOString().replaceAll(':','-');
const root=resolve('../..'),directory=resolve(root,improvise?'build-improvise-completion/cloud/'+stamp:completion?'build-dna-completion/cloud/'+stamp:startup?'build-song-finish/startup/'+stamp:repair?'build-song-repair/cloud':'build-hosted-song-trial/final'),evidence=resolve(root,improvise?'docs/evidence/improvise-finish/cloud/'+stamp:completion?'docs/evidence/dna-completion/cloud/'+stamp:startup?'docs/evidence/song-finish/startup/'+stamp:repair?'docs/evidence/song-generation-repair':'docs/evidence/hosted-songs');
const config=cloudSongConfig({...process.env,CREDIT_BILLING_MODE:'test',JAMLOOM_CLOUD_SONGS_ENABLED:'true',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'1000'})!;
assert.equal(config.endpoint,'jl77hn92npt65k');
const fixtures=diagnostic?[['reggae']]:improvise?[['reggae'],['jazz'],['edm'],['acousticpop']]:completion?[['metal','Enter Sandman — Metallica','Metal','en'],['jazz','Take Five — Dave Brubeck','Jazz','de']]:startup?[['startup','Enter Sandman — Metallica','Metal','en']]:repair?[['jazz-1','Feeling Good — Nina Simone','Jazz','en'],['spanish-1','La Bicicleta — Carlos Vives','Latin','es'],['jazz-2','Feeling Good — Nina Simone','Jazz','en'],['spanish-2','La Bicicleta — Carlos Vives','Latin','es']]:[['jazz','Feeling Good — Nina Simone','Jazz','en'],['rock','Enter Sandman — Metallica','Metal','en'],['spanish','La Bicicleta — Carlos Vives','Latin','es'],['turkish','Şımarık — Tarkan','Turkish Pop','tr'],['russian','Группа крови — Кино','Rock','ru'],['funk'],['reggae'],['jazz-phrase']];
assert(maxWorkers*(maxSeconds+130)*config.rate/1e6+fixtures.length*.02<maxUSD,'Trial exceeds conservative budget including shutdown retries');
if(!process.argv.includes('--apply')){console.log({mode:'dry-run',maxUSD,maxWorkers,maxSeconds,requests:fixtures.length,...(startup?{directory,evidence,minWorkers:0,scaling:'REQUEST_COUNT / 1',activationDelaySeconds:30,manualReconciliation:false}:{}),...(repair||startup||completion||improvise?{requires:'Approved paid trial and JAMLOOM_TRIAL_IMAGE digest'}:{}),...(improvise?{durations:fixtures.map((_,i)=>30+5*i),source:'--source synthetic WAV required',websiteDeployment:false}:{}),...(completion?{durations:[140,100],identityConversion:true,websiteDeployment:false}:{}),...(repair?{seeds:fixtures.map((_,i)=>6302301+i)}:{})});process.exit(0);}
const db=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(db.hostname,'127.0.0.1');
await mkdir(directory,{recursive:true});await mkdir(evidence,{recursive:true});
const state:any={startedAt:new Date().toISOString(),maxUSD,maxWorkers,maxSeconds,scope:diagnostic?'single-reggae-diagnostic':'qualification',requests:[],health:[],cleanup:false};
const save=()=>writeFile(resolve(evidence,'trial-result.json'),JSON.stringify(state,(_,v)=>typeof v==='bigint'?String(v):v,2)+'\n');
await writeFile(resolve(directory,'intent.json'),JSON.stringify(state),{flag:'wx',mode:0o600});
const rest=async(path:string,method='GET',body?:unknown)=>{const response=await fetch('https://rest.runpod.io/v1/'+path,{method,headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});assert(response.ok,`Runpod control HTTP ${response.status}`);return response.json();};
const control=(method='GET',body?:unknown)=>rest('endpoints/'+config.endpoint,method,body);
const before=await control();assert(before.name==='jamloom-music-v1'&&before.workersMin===0&&before.workersMax===0);
if(startup){assert.equal(before.scalerType,'REQUEST_COUNT');assert.equal(before.scalerValue,1);state.activationDelaySeconds=30;state.manualReconciliation=false;}
if(repair||startup||completion||improvise){const image=process.env.JAMLOOM_TRIAL_IMAGE;assert(image&&/^ghcr\.io\/sariserhan\/jamloom\/music-worker@sha256:[a-f0-9]{64}$/.test(image),'A reviewed immutable worker image is required');const template=await rest('templates/'+encodeURIComponent(before.templateId)+'?includeEndpointBoundTemplates=true');assert.equal(template.imageName,image);if(completion)assert.equal(template.env?.JAMLOOM_VOCAL_IDENTITY_ENABLED,'true','Prepared trial template must enable approved voice conversion');state.image=image;}
state.disabled=true;state.templateId=before.templateId;state.endpoint=config.endpoint;
const billing=()=>rest(`billing/endpoints?endpointId=${config.endpoint}&bucketSize=hour&startTime=${new Date().toISOString().slice(0,10)}T00:00:00Z&endTime=${new Date(Date.now()+86400000).toISOString().slice(0,10)}T00:00:00Z`);
state.billingBefore=await billing();
const admin=createPool(db.href),name='jamloom_trial_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);db.pathname='/'+name;
const pool=createPool(db.href),store=r2AudioStore(),services=['music-dna','improvise'].map(product=>new CloudSongs(new DnaCommerce(pool,randomUUID().repeat(3),store,{product:product as 'music-dna'|'improvise',budget:config.budget}),config));
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));let dispatchReady=false,enabled=false,watchdog:ReturnType<typeof spawn>|undefined,stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
try{
 await migrate(pool);const initial=await services[0].provider.health();assert.equal(initial.jobs?.inQueue,0);assert.equal(initial.jobs?.inProgress,0);
 if(startup)assert(Object.values(initial.workers??{}).every(value=>value===0),'Startup requires zero existing workers');
 if(improvise)assert(process.argv.includes('--source')&&process.argv[process.argv.indexOf('--source')+1],'Provide --source before starting a trial');
 const source=improvise?await readFile(resolve(process.argv[process.argv.indexOf('--source')+1])):repair||startup||completion?Buffer.alloc(0):await readFile(resolve(directory,'source.wav'));
 if(improvise)assert(process.argv.includes('--source')&&source.length>=44&&source.length<=24000000&&source.toString('ascii',0,4)==='RIFF','Use an explicitly permitted bounded WAV');
 if(improvise)checkSource(source,source.length,createHash('sha256').update(source).digest('hex'));
 for(let i=0;i<fixtures.length;i++){
  const [label,reference,genre,language]=fixtures[i],songs=services[improvise?1:i<5?0:1],owner='trial-'+i,id=randomUUID().replaceAll('-','');
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await songs.commerce.wallet.grant(owner,{provider:'stripe_test',receipt:owner,credits:50,netMicros:30000000});
  let input:unknown;
  if(!improvise&&i<5)input=await songs.input(owner,{...emptyTaste,references:[reference],referenceMetadata:[{reference,genre,source:'itunes'}],vocalLanguage:language});
  else{const grant=await songs.upload(owner,{bytes:source.length,sha256:createHash('sha256').update(source).digest('hex'),consent:true});const uploaded=await fetch(grant.url,{method:'PUT',headers:{'Content-Type':'audio/wav','Content-Length':String(source.length)},body:source,signal:AbortSignal.timeout(15000)});assert(uploaded.ok);input=await songs.input(owner,{sourceId:grant.id,phrase:improvise?'':'I have a question',genre:label==='jazz-phrase'?'jazz':label,voice:'female',consent:true});}
  const quote=await songs.commerce.quote(owner,input,i%2?'private':'public');await songs.submit(owner,id,input,i%2?'private':'public',quote.token);
  if(repair)await pool.query("UPDATE cloud_song_runs SET payload=jsonb_set(payload,'{seed}',$2::jsonb) WHERE id=$1 AND provider_id IS NULL",[id,JSON.stringify(6302301+i)]);
  if(improvise)await pool.query("UPDATE cloud_song_runs SET payload=payload||$2::jsonb WHERE id=$1 AND provider_id IS NULL",[id,JSON.stringify({duration_seconds:30+5*i})]);
  if(completion)await pool.query("UPDATE cloud_song_runs SET payload=payload||$2::jsonb WHERE id=$1 AND provider_id IS NULL",[id,JSON.stringify({seed:9102401+i,duration_seconds:i?100:140})]);
  state.requests.push({id,owner,label,product:songs.commerce.product,quotedCredits:quote.credits,transitions:[]});
 }
 await save();
 // Independent shutdown survives an interrupted trial process, including bounded control retries.
 watchdog=spawn(process.execPath,['--input-type=module','-e',`setTimeout(async()=>{for(let n=0;n<10;n++){try{const r=await fetch('https://rest.runpod.io/v1/endpoints/'+process.env.RUNPOD_ENDPOINT_ID,{method:'PATCH',headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({workersMin:0,workersMax:0}),signal:AbortSignal.timeout(10000)});if(r.ok)process.exit(0);}catch{}await new Promise(r=>setTimeout(r,3000));}process.exit(1);},${maxSeconds*1000});`],{env:process.env,stdio:'ignore',detached:true});watchdog.unref();
 const started=Date.now();enabled=true;state.disabled=false;await control('PATCH',{workersMin:startup?0:maxWorkers,workersMax:maxWorkers});
 // Give endpoint configuration a moment to reach its queue API.
 await delay(startup?30000:5000);
 while(!stopping&&Date.now()-started<(maxSeconds-120)*1000){
  const health=await services[0].provider.health();state.health.push({seconds:Math.round((Date.now()-started)/1000),...health});
  const workers=health.workers??{},count=['idle','initializing','running'].reduce((n,k)=>n+Number(workers[k]??0),0);
  if(count>maxWorkers){state.stopReason='Provider exceeded worker bound';break;}
  // A newly published image can return HTTP 409 until its first worker is ready.
  if(!startup&&Number(workers.ready??0)+Number(workers.running??0)===0){await save();console.log(JSON.stringify({seconds:Math.round((Date.now()-started)/1000),workers}));await delay(10000);continue;}
  if((completion||improvise)&&!dispatchReady){
   // Trial-only prewarming is outside customer request time; never extend an active job.
   await pool.query("UPDATE cloud_song_runs SET deadline=now()+($1 * interval '1 second') WHERE provider_id IS NULL",[Math.min(config.ttlSeconds,maxSeconds-120-Math.ceil((Date.now()-started)/1000))]);
   state.prewarmSeconds=Math.round((Date.now()-started)/1000);dispatchReady=true;
  }
  await Promise.all(state.requests.map(async(r:any)=>{const songs=services[r.product==='music-dna'?0:1];try{await songs.tick(r.id);}catch(error){r.pollErrors=(r.pollErrors??0)+1;r.error=error instanceof Error?error.message:'Poll failed';}const row=await songs.commerce.row(r.id),run=(await pool.query('SELECT provider_id,provider_status,execution_ms,delay_ms,estimated_cost_micros,provider_receipt->>\'failure\' AS failure FROM cloud_song_runs WHERE id=$1',[r.id])).rows[0];Object.assign(r,run);r.state=row.state;if(r.transitions.at(-1)?.state!==row.state||r.transitions.at(-1)?.provider!==run.provider_status)r.transitions.push({seconds:Math.round((Date.now()-started)/1000),state:row.state,provider:run.provider_status});if(row.state==='completed'&&!r.saved){const savedAudio=await store.get(row.audio_key,row.audio_bytes);assert.equal(createHash('sha256').update(savedAudio).digest('hex'),row.audio_sha256);await writeFile(resolve(directory,r.label+'.wav'),savedAudio);await writeFile(resolve(directory,r.label+'.json'),JSON.stringify(row.song_plan,null,2));if(completion){const receipt=(await pool.query('SELECT provider_receipt FROM cloud_song_runs WHERE id=$1',[r.id])).rows[0].provider_receipt;await writeFile(resolve(directory,r.label+'-receipt.json'),JSON.stringify(receipt,null,2));r.duration=receipt.output.seconds;r.identity=receipt.output.performance?.vocal_identity?.id;assert(r.identity,'Missing completed voice conversion receipt');assert.equal(receipt.output.performance.audio_sha256,row.audio_sha256);}
if(improvise){assert(row.song_plan.arrangement.sample_used);assert(row.song_plan.arrangement.events.length>0);assert.equal(row.song_plan.arrangement.original_recording_sha256,createHash('sha256').update(source).digest('hex'));r.pattern=row.song_plan.arrangement.pattern;r.duration=row.song_plan.cases[0].duration;assert.equal(r.duration,30+5*state.requests.indexOf(r));}
r.saved=true;r.audioSha256=row.audio_sha256;r.balance=await songs.commerce.wallet.balance(r.owner);}}));
  await save();console.log(JSON.stringify({seconds:Math.round((Date.now()-started)/1000),jobs:state.requests.map((r:any)=>r.label+':'+r.state),workers}));
  if(state.requests.every((r:any)=>['completed','failed','cancelled'].includes(r.state)))break;
  await delay(10000);
 }
}catch(error){state.error=error instanceof Error?error.message:'Trial interrupted';throw error;}
finally{
 for(const r of state.requests)try{const songs=services[r.product==='music-dna'?0:1];await songs.cancel(r.owner,r.id);r.finalState=(await songs.commerce.row(r.id))?.state;r.state=r.finalState;r.finalBalance=await songs.commerce.wallet.balance(r.owner);}catch{r.cancelUnconfirmed=true;}
 if(enabled){for(let i=0;i<5;i++)try{await control('PATCH',{workersMin:0,workersMax:0});const result=await control();assert(result.workersMax===0&&result.workersMin===0);state.disabled=true;break;}catch{await delay(2000);}}
 for(let i=0;i<12;i++){const health=await services[0].provider.health();state.finalHealth=health;const active=Object.entries(health.workers??{}).filter(([k])=>k!=='unhealthy').reduce((n,[,v])=>n+Number(v??0),0);if(!active&&health.jobs?.inProgress===0&&health.jobs?.inQueue===0){state.stopped=true;break;}await delay(5000);}
 if(state.disabled&&state.stopped){watchdog?.kill();const keys=(await pool.query('SELECT object_key AS key FROM song_uploads UNION SELECT output_key FROM cloud_song_runs UNION SELECT audio_key FROM dna_song_jobs WHERE audio_key IS NOT NULL')).rows;for(const {key} of keys)await store.remove(key);state.removedObjects=keys.length;state.cleanup=true;}
 if(improvise){state.creditSettlement=state.requests.every((r:any,i:number)=>{
  r.expectedCredits=r.state==='completed'?allocateCredits([{id:'trial',net_micros:30000000,credits:50,available:50}],Number(r.estimated_cost_micros),5000,i%2===1).reduce((n,a)=>n+a.n,0):0;
  return r.expectedCredits<=r.quotedCredits&&Number(r.finalBalance?.available)===50-r.expectedCredits&&Number(r.finalBalance?.reserved)===0;
 });state.qualification=state.creditSettlement&&state.requests.length===fixtures.length&&state.requests.every((r:any)=>r.state==='completed'&&r.saved)?'PASS':'FAIL';}
 if(completion){state.qualification=state.requests.length===2&&state.requests.every((r:any)=>r.state==='completed'&&r.saved&&r.identity&&Number(r.finalBalance?.reserved)===0)?'PASS':'FAIL';}
 state.billingAfter=await billing();state.finishedAt=new Date().toISOString();await save();
 await pool.end();if(state.cleanup)await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);else state.retainedDatabase=name;await admin.end();await save();
 assert(state.disabled&&state.stopped&&state.cleanup,'Trial shutdown/cleanup needs attention');
 console.log(JSON.stringify({disabled:state.disabled,stopped:state.stopped,cleanup:state.cleanup,...(completion||improvise?{qualification:state.qualification}:{}),results:state.requests.map((r:any)=>({label:r.label,state:r.state}))}));
 if(improvise&&!state.error)assert.equal(state.qualification,'PASS','Inspect retained trial evidence; do not automatically retry');
}
