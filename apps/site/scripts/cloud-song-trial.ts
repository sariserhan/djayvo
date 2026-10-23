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
import {CloudSongs} from '../lib/cloud-songs';
import {cloudSongConfig} from '../lib/cloud-song-config';

const root=resolve('../..'),directory=resolve(root,'build-hosted-song-trial/final'),evidence=resolve(root,'docs/evidence/hosted-songs');
const config=cloudSongConfig({...process.env,JAMLOOM_CLOUD_SONGS_ENABLED:'true',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'1000'})!;
assert.equal(config.endpoint,'jl77hn92npt65k');
const fixtures=[['jazz','Feeling Good — Nina Simone','Jazz','en'],['rock','Enter Sandman — Metallica','Metal','en'],['spanish','La Bicicleta — Carlos Vives','Latin','es'],['turkish','Şımarık — Tarkan','Turkish Pop','tr'],['russian','Группа крови — Кино','Rock','ru'],['funk'],['reggae'],['jazz-phrase']];
if(!process.argv.includes('--apply')){console.log({mode:'dry-run',maxUSD:3,maxWorkers:2,maxSeconds:780,requests:fixtures.length});process.exit(0);}
const db=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(db.hostname,'127.0.0.1');
await mkdir(directory,{recursive:true});await mkdir(evidence,{recursive:true});
const state:any={startedAt:new Date().toISOString(),maxUSD:3,maxWorkers:2,maxSeconds:780,requests:[],health:[],cleanup:false};
const save=()=>writeFile(resolve(evidence,'trial-result.json'),JSON.stringify(state,(_,v)=>typeof v==='bigint'?String(v):v,2)+'\n');
await writeFile(resolve(directory,'intent.json'),JSON.stringify(state),{flag:'wx',mode:0o600});
const rest=async(path:string,method='GET',body?:unknown)=>{const response=await fetch('https://rest.runpod.io/v1/'+path,{method,headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});assert(response.ok,`Runpod control HTTP ${response.status}`);return response.json();};
const control=(method='GET',body?:unknown)=>rest('endpoints/'+config.endpoint,method,body);
const before=await control();assert(before.name==='jamloom-music-v1'&&before.workersMin===0&&before.workersMax===0);
state.disabled=true;state.templateId=before.templateId;state.endpoint=config.endpoint;
const billing=()=>rest(`billing/endpoints?endpointId=${config.endpoint}&bucketSize=hour&startTime=${new Date().toISOString().slice(0,10)}T00:00:00Z&endTime=${new Date(Date.now()+86400000).toISOString().slice(0,10)}T00:00:00Z`);
state.billingBefore=await billing();
const admin=createPool(db.href),name='jamloom_trial_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);db.pathname='/'+name;
const pool=createPool(db.href),store=r2AudioStore(),services=['music-dna','improvise'].map(product=>new CloudSongs(new DnaCommerce(pool,randomUUID().repeat(3),store,{product:product as 'music-dna'|'improvise',budget:config.budget}),config));
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));let enabled=false,watchdog:ReturnType<typeof spawn>|undefined,stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
try{
 await migrate(pool);const initial=await services[0].provider.health();assert.equal(initial.jobs?.inQueue,0);assert.equal(initial.jobs?.inProgress,0);
 const source=await readFile(resolve(directory,'source.wav'));
 for(let i=0;i<fixtures.length;i++){
  const [label,reference,genre,language]=fixtures[i],songs=services[i<5?0:1],owner='trial-'+i,id=randomUUID().replaceAll('-','');
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await songs.commerce.wallet.grant(owner,{provider:'stripe_test',receipt:owner,credits:50,netMicros:30000000});
  let input:unknown;
  if(i<5)input=await songs.input(owner,{...emptyTaste,references:[reference],referenceMetadata:[{reference,genre,source:'itunes'}],vocalLanguage:language});
  else{const grant=await songs.upload(owner,{bytes:source.length,sha256:createHash('sha256').update(source).digest('hex'),consent:true});const uploaded=await fetch(grant.url,{method:'PUT',headers:{'Content-Type':'audio/wav','Content-Length':String(source.length)},body:source,signal:AbortSignal.timeout(15000)});assert(uploaded.ok);input=await songs.input(owner,{sourceId:grant.id,phrase:'I have a question',genre:label==='jazz-phrase'?'jazz':label,voice:'female',consent:true});}
  const quote=await songs.commerce.quote(owner,input,i%2?'private':'public');await songs.submit(owner,id,input,i%2?'private':'public',quote.token);
  state.requests.push({id,owner,label,product:songs.commerce.product,quotedCredits:quote.credits,transitions:[]});
 }
 await save();
 // Independent shutdown survives an interrupted trial process. The conservative bound is $2.40 plus storage allowance.
 watchdog=spawn(process.execPath,['--input-type=module','-e',`setTimeout(async()=>{for(let n=0;n<10;n++){try{const r=await fetch('https://rest.runpod.io/v1/endpoints/'+process.env.RUNPOD_ENDPOINT_ID,{method:'PATCH',headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({workersMin:0,workersMax:0}),signal:AbortSignal.timeout(10000)});if(r.ok)process.exit(0);}catch{}await new Promise(r=>setTimeout(r,3000));}process.exit(1);},780000);`],{env:process.env,stdio:'ignore',detached:true});watchdog.unref();
 const started=Date.now();enabled=true;state.disabled=false;await control('PATCH',{workersMin:0,workersMax:2});
 // Give endpoint configuration a moment to reach its queue API.
 await delay(5000);
 while(!stopping&&Date.now()-started<660000){
  const health=await services[0].provider.health();state.health.push({seconds:Math.round((Date.now()-started)/1000),...health});
  const workers=health.workers??{},count=['idle','initializing','running'].reduce((n,k)=>n+Number(workers[k]??0),0);
  if(count>2){state.stopReason='Provider exceeded two-worker bound';break;}
  if(Number(workers.ready??0)+Number(workers.running??0)===0){await save();console.log(JSON.stringify({seconds:Math.round((Date.now()-started)/1000),workers}));await delay(10000);continue;}
  await Promise.all(state.requests.map(async(r:any)=>{const songs=services[r.product==='music-dna'?0:1];try{await songs.tick(r.id);}catch(error){r.pollErrors=(r.pollErrors??0)+1;r.error=error instanceof Error?error.message:'Poll failed';}const row=await songs.commerce.row(r.id),run=(await pool.query('SELECT provider_id,provider_status,execution_ms,delay_ms,estimated_cost_micros FROM cloud_song_runs WHERE id=$1',[r.id])).rows[0];Object.assign(r,run);r.state=row.state;if(r.transitions.at(-1)?.state!==row.state||r.transitions.at(-1)?.provider!==run.provider_status)r.transitions.push({seconds:Math.round((Date.now()-started)/1000),state:row.state,provider:run.provider_status});if(row.state==='completed'&&!r.saved){await writeFile(resolve(directory,r.label+'.wav'),await store.get(row.audio_key,row.audio_bytes));await writeFile(resolve(directory,r.label+'.json'),JSON.stringify(row.song_plan,null,2));r.saved=true;r.audioSha256=row.audio_sha256;r.balance=await songs.commerce.wallet.balance(r.owner);}}));
  await save();console.log(JSON.stringify({seconds:Math.round((Date.now()-started)/1000),jobs:state.requests.map((r:any)=>r.label+':'+r.state),workers}));
  if(state.requests.every((r:any)=>['completed','failed','cancelled'].includes(r.state)))break;
  await delay(10000);
 }
}catch(error){state.error=error instanceof Error?error.message:'Trial interrupted';throw error;}
finally{
 for(const r of state.requests)try{const songs=services[r.product==='music-dna'?0:1];await songs.cancel(r.owner,r.id);r.finalState=(await songs.commerce.row(r.id))?.state;r.finalBalance=await songs.commerce.wallet.balance(r.owner);}catch{r.cancelUnconfirmed=true;}
 if(enabled){for(let i=0;i<5;i++)try{await control('PATCH',{workersMin:0,workersMax:0});const result=await control();assert(result.workersMax===0&&result.workersMin===0);state.disabled=true;break;}catch{await delay(2000);}}
 for(let i=0;i<12;i++){const health=await services[0].provider.health();state.finalHealth=health;const active=Object.entries(health.workers??{}).filter(([k])=>k!=='unhealthy').reduce((n,[,v])=>n+Number(v??0),0);if(!active&&health.jobs?.inProgress===0&&health.jobs?.inQueue===0){state.stopped=true;break;}await delay(5000);}
 if(state.disabled&&state.stopped){watchdog?.kill();const keys=(await pool.query('SELECT object_key AS key FROM song_uploads UNION SELECT output_key FROM cloud_song_runs UNION SELECT audio_key FROM dna_song_jobs WHERE audio_key IS NOT NULL')).rows;for(const {key} of keys)await store.remove(key);state.removedObjects=keys.length;state.cleanup=true;}
 state.billingAfter=await billing();state.finishedAt=new Date().toISOString();await save();
 await pool.end();if(state.cleanup)await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);else state.retainedDatabase=name;await admin.end();await save();
 assert(state.disabled&&state.stopped&&state.cleanup,'Trial shutdown/cleanup needs attention');
 console.log(JSON.stringify({disabled:state.disabled,stopped:state.stopped,cleanup:state.cleanup,results:state.requests.map((r:any)=>({label:r.label,state:r.state}))}));
}
