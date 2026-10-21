// Real C++ audio + local Postgres + private disk; no GPU rental, provider call or real charge.
import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdtemp,stat} from 'node:fs/promises';import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';import {join,relative} from 'node:path';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';
import {GenerationQueue} from '../lib/generation-queue';import {runBudgeted,verifyPermit} from '../lib/generation-budget';
import {localAudioStore} from '../lib/audio-store';import {PrivateAudio} from '../lib/private-audio';
import {validateWav,MAX_AUDIO_BYTES} from '../lib/audio-validation';
const root=fileURLToPath(new URL('../../../',import.meta.url)),sourceFolder=join(root,'renders/full-product-baseline-20261020');
const frozen=JSON.parse(await readFile(join(sourceFolder,'freeze.json'),'utf8'));
const sourceId='ls-2277-149896-0026',source=frozen.inputs.find((r:{id:string})=>r.id===sourceId);
assert.equal(source.license.id,'CC-BY-4.0');assert.equal(source.consent.local_processing,true);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const input=await readFile(join(sourceFolder,sourceId,'source.wav')),plan=await readFile(join(sourceFolder,sourceId,'A.reggae.score.json'));
assert.equal(sha(input),source.sha256);const parsed=JSON.parse(plan.toString());assert.equal(parsed.source.consent_confirmed,true);
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_render_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),wallet=new Wallet(pool),secret=randomUUID()+randomUUID(),queue=new GenerationQueue(pool,secret);
const output=await mkdtemp(join(root,'renders/full-product-worker-')),prefix=join(output,'result'),renderer=join(root,'build-product/jamloom_remix');
try{
 await migrate(pool);for(const owner of ['listener','other'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
 await wallet.grant('listener',{provider:'stripe_test',receipt:'local-render-fixture',credits:10,netMicros:4_000_000});
 const spec={inputSha256:sha(input),planSha256:sha(plan),maxRuntimeMs:120000,hourlyMicros:750000,fixedCostMicros:10000};
 const id=await wallet.reserve('listener','local_render_smoke',100000,5000,spec),claim=await queue.claim('local_cpp_fixture');assert.equal(claim?.id,id);
 const permit=verifyPermit(claim!.permit,secret);assert.equal(permit.inputSha256,sha(input));assert.equal(permit.planSha256,sha(plan));
 // Snapshot exact validated bytes into a new private working directory before process execution.
 await writeFile(join(output,'source.wav'),input,{flag:'wx',mode:0o600});await writeFile(join(output,'plan.json'),plan,{flag:'wx',mode:0o600});
 let child:ReturnType<typeof spawn>|undefined,exited:Promise<void>|undefined,signalTimer:ReturnType<typeof setInterval>|undefined,stopping=false;let log='';
 const start=performance.now();
 await runBudgeted(permit,signal=>new Promise<void>((resolve,reject)=>{
  const processChild=spawn(renderer,['--input',join(output,'source.wav'),'--consent','--plan',join(output,'plan.json'),'--style','reggae','--seed',String(parsed.seed),'--stems','--output',prefix],{cwd:root,env:{PATH:process.env.PATH,NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});child=processChild;
  exited=new Promise<void>((done,fail)=>{child!.once('error',fail);child!.once('exit',()=>done());});exited.catch(()=>{});
  processChild.stdout.on('data',s=>{log+=s});processChild.stderr.on('data',s=>{log+=s});
  processChild.once('error',reject);processChild.once('exit',code=>code===0?resolve():reject(new Error('Renderer exit '+code)));
  const stop=()=>{stopping=true;child?.kill('SIGKILL');reject(new Error('Render cancelled or lease lost'));};
  signal.addEventListener('abort',()=>{if(child?.exitCode===null&&child.signalCode===null)stop();},{once:true});
  signalTimer=setInterval(()=>{if(!stopping)void queue.heartbeat(id,claim!.leaseToken).then(ok=>{if(!ok)stop();},stop);},5000);
 }),async()=>{clearInterval(signalTimer);if(child?.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exited;});
 const elapsed=performance.now()-start;
 await readFile(prefix+'.complete.json');const path=prefix+'.reggae.wav';assert.ok((await stat(path)).size<=MAX_AUDIO_BYTES);
 const wav=await readFile(path),digest=sha(wav),duration=validateWav(wav,wav.length,digest);
 assert.equal(digest,sha(await readFile(join(sourceFolder,sourceId,'A.reggae.wav'))),'Signed fixed-plan replay must match frozen baseline');
 const audio=new PrivateAudio(pool,localAudioStore(join(output,'private-store')));
 const intent=await audio.reserve('listener',{requestId:id,title:'Local generation pipeline check',strategy:'reggae',bytes:wav.length,sha256:digest,consent:true});
 await audio.localUpload('listener',intent.id,wav);await audio.finalize('listener',intent.id);
 assert.deepEqual((await audio.playback('listener',intent.id)).data,wav);await assert.rejects(audio.playback('other',intent.id),/not found/);
 // Hypothetical rental pricing exercises accounting; actual provider spend is zero.
 const modeledCost=spec.fixedCostMicros+Math.ceil(spec.hourlyMicros*elapsed/3600000);
 await queue.stopped(id,claim!.leaseToken,modeledCost,'completed',digest);await queue.reconcile(id);
 const balance=await wallet.balance('listener');assert.deepEqual(balance,{available:9,reserved:0});
 const evidence={status:'PASS',source_id:sourceId,source_license:source.license,input_sha256:sha(input),plan_sha256:sha(plan),renderer_sha256:sha(await readFile(renderer)),output:relative(root,output),output_sha256:digest,duration_ms:duration,elapsed_ms:elapsed,modeled_cost_micros:modeledCost,actual_external_spend_usd:0,captured_fixture_credits:1,balance,checks:['hash-bound durable job','single local C++ process','complete export and WAV validation','byte-identical baseline replay','private store finalization and playback','other owner denied','idempotent financial settlement'],real_vast:'NOT RUN',real_r2:'NOT RUN',real_stripe:'NOT RUN',musical_improvement:'NOT RUN'};
 await writeFile(join(output,'ATTRIBUTION.txt'),source.license.attribution+'\n');await writeFile(join(output,'render.log'),log);
 await writeFile(join(root,'docs/evidence/full-product/generation-render.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
