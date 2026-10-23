import {cloudPersonalFeedback} from './cloud-song-feedback';
import {createHash,randomUUID,randomInt} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {DnaCommerce,type DnaVisibility} from './dna-commerce';
import {RunpodProvider,type RunpodJob,type RunpodResult} from './runpod-provider';
import type {CloudSongConfig} from './cloud-song-config';
import {AudioError,validateWav} from './audio-validation';
import {songInput} from './dna-song';
import {musicDirection} from './taste-direction';
import styles from '../../../assets/manifests/improvise-styles.json';

const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const terminal=(state:string)=>['completed','failed','cancelled'].includes(state);
export const songId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export function sourceReceipt(v:Record<string,unknown>){
 if(!Number.isSafeInteger(v.bytes)||Number(v.bytes)<44||Number(v.bytes)>10000044||typeof v.sha256!=='string'||!/^[a-f0-9]{64}$/.test(v.sha256)||v.consent!==true)throw new AudioError('Choose a recording of up to five minutes and confirm permission.');
 return {bytes:Number(v.bytes),sha256:v.sha256};
}
export function recordingInput(v:Record<string,unknown>){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AudioError('Choose a recording first.');
 if(!songId(v.sourceId)||v.consent!==true||!['surprise','female','male'].includes(String(v.voice))||!['surprise',...Object.keys(styles)].includes(String(v.genre))||typeof v.phrase!=='string'||v.phrase.length>32000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v.phrase))throw new AudioError('Choose a recording, style and voice, and confirm permission.');
 return {sourceId:v.sourceId,phrase:v.phrase.trim(),voice:String(v.voice),genre:String(v.genre),consent:true};
}
export function checkSource(audio:Buffer,bytes:number,sha:string){
 if(audio.length!==bytes||hash(audio)!==sha||audio.toString('ascii',0,4)!=='RIFF'||audio.readUInt32LE(4)!==bytes-8||audio.toString('ascii',8,16)!=='WAVEfmt '||audio.readUInt32LE(16)!==16||audio.readUInt16LE(20)!==1||audio.readUInt16LE(22)!==1||audio.readUInt32LE(24)!==16000||audio.readUInt32LE(28)!==32000||audio.readUInt16LE(32)!==2||audio.readUInt16LE(34)!==16||audio.toString('ascii',36,40)!=='data'||audio.readUInt32LE(40)!==bytes-44||(bytes-44)%2||bytes<=44||bytes>9600044)throw new AudioError('The recording could not be verified. Upload it again.');
}
export class CloudSongs{
 constructor(readonly commerce:DnaCommerce,readonly config:CloudSongConfig,readonly provider:Pick<RunpodProvider,'submit'|'status'|'cancel'|'health'>=new RunpodProvider(config.key,config.endpoint)){
  if(!commerce.store)throw Error('Song storage is required');
 }
 async upload(owner:string,value:Record<string,unknown>){
  const {bytes,sha256}=sourceReceipt(value),id=randomUUID().replaceAll('-',''),key=`uploads/${randomUUID()}.wav`;
  // Limit abandoned upload grants per account without reading or accepting arbitrary object keys.
  const count=await this.commerce.pool.query("SELECT count(*)::int AS n FROM song_uploads WHERE owner_id=$1 AND created_at>now()-interval '1 day'",[owner]);
  if(count.rows[0].n>=20)throw new AudioError('You’ve uploaded several recordings today. Please try again later.',429);
  await this.commerce.pool.query('INSERT INTO song_uploads(id,owner_id,object_key,bytes,sha256) VALUES($1,$2,$3,$4,$5)',[id,owner,key,bytes,sha256]);
  return {id,url:await this.commerce.store!.uploadURL(key,bytes,600)};
 }
 async input(owner:string,value:unknown){
  if(this.commerce.product==='music-dna'){
   let profile;try{profile=songInput(value);}catch{throw new AudioError('Choose songs or artists from search before making your song.');}if(!musicDirection(profile))throw new AudioError('Choose a specific song or artist from search so we can find your style.',422);return profile;
  }
  const input=recordingInput(value as Record<string,unknown>);
  if(!(await this.commerce.pool.query('SELECT 1 FROM song_uploads WHERE id=$1 AND owner_id=$2 AND expires_at>now()',[input.sourceId,owner])).rowCount)throw new AudioError('Upload your recording again.');
  return input;
 }
 async submit(owner:string,id:string,input:unknown,visibility:DnaVisibility,token:string,country:string|null=null){
  if(!songId(id))throw new AudioError('Invalid song request.');
  const prior=await this.commerce.row(id);
  if(prior){
   if(prior.owner_id!==owner||prior.visibility!==visibility||!isDeepStrictEqual(prior.profile,input))throw new AudioError('This request belongs to different song choices.',409);
   return {id,state:prior.state};
  }
  let source:any;
  if(this.commerce.product==='improvise'){
   source=(await this.commerce.pool.query('SELECT * FROM song_uploads WHERE id=$1 AND owner_id=$2 AND expires_at>now()',[(input as {sourceId:string}).sourceId,owner])).rows[0];
   if(!source)throw new AudioError('Upload your recording again.');
   checkSource(await this.commerce.store!.get(source.object_key,source.bytes),source.bytes,source.sha256);
  }
  const payload=this.commerce.product==='music-dna'?{profile:input,seed:randomInt(2**32),...(country&&/^[A-Z]{2}$/.test(country)?{country}:{})}:(()=>{const {sourceId,...rest}=input as Record<string,unknown>;return rest;})();
  if(this.commerce.product==='music-dna'){const feedback=await cloudPersonalFeedback({commerce:this.commerce,owner},musicDirection(input as ReturnType<typeof songInput>)!.id,(input as {vocalLanguage?:string}).vocalLanguage??'auto');if(feedback.length)payload.feedback=feedback;}
  await this.commerce.submit(owner,id,input,visibility,token,async db=>{
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-cloud-daily-cap',0))");
   const total=(await db.query("SELECT COALESCE(sum(d.cost_cap_micros),0) AS n FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE d.created_at>now()-interval '24 hours'")).rows[0];
   if(Number(total.n)+this.config.costCapMicros>this.config.dailyMicros)throw new AudioError('We’ve reached today’s song limit. Your credits haven’t been used. Please try again later.',429);
   await db.query(`INSERT INTO cloud_song_runs(id,endpoint,payload,source_id,output_key,rate_micros,fixed_cost_micros,deadline)
    VALUES($1,$2,$3,$4,$5,$7,$8,now()+($6*interval '1 second'))`,[id,this.config.endpoint,JSON.stringify(payload),source?.id??null,`uploads/${randomUUID()}.wav`,this.config.ttlSeconds,this.config.rate,this.config.fixedCostMicros]);
  });
  return {id,state:'queued'};
 }
 async cancel(owner:string,id:string){
  const row=await this.commerce.row(id);if(!row||row.owner_id!==owner)throw new AudioError('Song not found.',404);
  if(row.state==='completed'){await this.commerce.withdraw(owner,id);return {withdrawn:true};}
  if(!terminal(row.state))await this.commerce.pool.query('UPDATE cloud_song_runs SET cancel_requested=true WHERE id=$1',[id]);
  await this.tick(id);return {state:(await this.commerce.row(id))?.state??row.state};
 }
 async status(owner:string,id:string){
  const row=await this.commerce.row(id);if(!row||row.owner_id!==owner)throw new AudioError('Song not found.',404);
  const run=(await this.commerce.pool.query('SELECT phase,cancel_requested FROM cloud_song_runs WHERE id=$1',[id])).rows[0];
  return {id,state:row.state,phase:run?.phase,cancelling:!!run?.cancel_requested&&!terminal(row.state)};
 }
 async tick(id:string){
  const {pool,store}=this.commerce,token=randomUUID();
  const run=(await pool.query(`UPDATE cloud_song_runs c SET lease_token=$2,lease_until=now()+interval '4 minutes',updated_at=now()
   FROM dna_song_jobs d WHERE c.id=$1 AND d.id=c.id AND d.product=$3 AND c.endpoint=$4 AND d.billing_live=$5 AND c.cleanup_at IS NULL
   AND (c.lease_until IS NULL OR c.lease_until<now()) RETURNING c.*`,[id,token,this.commerce.product,this.config.endpoint,!!this.commerce.options.live])).rows[0];
  if(!run)return;
  try{
   let row=await this.commerce.row(id);if(!row)return;
   if(terminal(row.state)){await this.cleanup(run);return;}
   const suspended=(await pool.query('SELECT u.suspended,w.frozen FROM "user" u JOIN credit_wallets w ON w.owner_id=u.id WHERE u.id=$1',[row.owner_id])).rows[0];
   const stop=run.cancel_requested||suspended?.suspended||suspended?.frozen||Date.now()>=new Date(run.deadline).getTime();
   if(!run.provider_id){
    if(run.submitted_at){
     // A lost POST may have incurred spend. Never submit it again or free its source while it may still run.
     if(Date.now()>new Date(run.deadline).getTime()+120000){
      const health=await this.provider.health();
      if(Number(health.jobs?.inQueue)===0&&Number(health.jobs?.inProgress)===0){await this.commerce.finish(id,run.cancel_requested?'cancelled':'failed');await this.cleanup(run);}
     }
     return;
    }
    if(stop){await this.commerce.finish(id,run.cancel_requested?'cancelled':'failed');await this.cleanup(run);return;}
    const job:RunpodJob={id,product:this.commerce.product,timeout_seconds:this.config.executionSeconds,ttl_seconds:this.config.ttlSeconds,
     output_url:await store!.uploadURL(run.output_key,(this.commerce.product==='music-dna'?120:30)*192000+44,this.config.ttlSeconds+300),payload:run.payload};
    if(run.source_id){
     const source=(await pool.query('SELECT * FROM song_uploads WHERE id=$1',[run.source_id])).rows[0];
     job.source={url:await store!.playbackURL(source.object_key,false,this.config.ttlSeconds+300),bytes:source.bytes,sha256:source.sha256};
    }
    // Persist dispatch intent before any network call. Expired leases can poll, never resubmit.
    await pool.query("UPDATE cloud_song_runs SET submitted_at=now(),phase='queued' WHERE id=$1",[id]);
    const submitted=await this.provider.submit(job);
    await pool.query('UPDATE cloud_song_runs SET provider_id=$2 WHERE id=$1',[id,submitted.id]);run.provider_id=submitted.id;
   }
   let result:RunpodResult=run.provider_receipt??await this.provider.status(run.provider_id);
   if(stop&&!['COMPLETED','FAILED','CANCELLED','TIMED_OUT'].includes(result.status)){await this.provider.cancel(run.provider_id);result=await this.provider.status(run.provider_id);}
   const phase=result.status==='IN_QUEUE'?'queued':result.status==='IN_PROGRESS'?'composing':result.status==='COMPLETED'?'saving':'failed';
   await pool.query('UPDATE cloud_song_runs SET provider_status=$2,phase=$3,execution_ms=$4,delay_ms=$5,updated_at=now() WHERE id=$1',[id,result.status,phase,result.executionTime??null,result.delayTime??null]);
   const estimate=Math.min(Number(row.cost_cap_micros),run.fixed_cost_micros+run.rate_micros*Math.ceil(((result.executionTime??this.config.executionSeconds*1000)+(result.delayTime??600000))/1000));
   await pool.query('UPDATE cloud_song_runs SET estimated_cost_micros=$2 WHERE id=$1',[id,estimate]);
   if(result.status==='IN_PROGRESS')await this.commerce.start(id);
   if(['FAILED','CANCELLED','TIMED_OUT'].includes(result.status)){
    await this.commerce.finish(id,run.cancel_requested?'cancelled':'failed');await this.cleanup(run);return;
   }
   if(result.status!=='COMPLETED')return;
   await pool.query('UPDATE cloud_song_runs SET provider_receipt=$2 WHERE id=$1',[id,JSON.stringify(result)]);
   row=await this.commerce.row(id);
   if(suspended?.suspended||suspended?.frozen||Date.now()>new Date(run.deadline).getTime()+120000){await this.commerce.finish(id,'failed');await this.cleanup(run);return;}
   // Honor cancellation received before saving the completed song.
   if((await pool.query('SELECT cancel_requested FROM cloud_song_runs WHERE id=$1',[id])).rows[0].cancel_requested){await this.commerce.finish(id,'cancelled');await this.cleanup(run);return;}
   const output=result.output;if(!output)throw new AudioError('The finished song could not be verified.',422);
   const seconds=this.commerce.product==='music-dna'?120:30;
   if(output.schema!=='jamloom-runpod-1'||output.id!==id||output.product!==this.commerce.product||output.audio_bytes!==seconds*192000+44||typeof output.audio_sha256!=='string'||!/^[a-f0-9]{64}$/.test(output.audio_sha256))throw new AudioError('The finished song could not be verified.',422);
   const audio=await store!.get(run.output_key,Number(output.audio_bytes));
   try{if(validateWav(audio,Number(output.audio_bytes),output.audio_sha256,24000000)!==seconds*1000)throw Error();}
   catch{throw new AudioError('The finished song could not be verified.',422);}
   const plan=output.plan as any,fit=output.fit as any;
   if(this.commerce.product==='music-dna'&&(fit?.accepted!==true||fit.audio_sha256!==output.audio_sha256||fit.target!==musicDirection(row.profile)?.id||typeof plan?.title!=='string'||!plan.title.trim()||plan.title.length>100||!Array.isArray(plan.cases)||plan.cases.length!==1||typeof plan.cases[0]?.lyrics!=='string'||!plan.cases[0].lyrics.trim()||plan.cases[0].lyrics.length>4000))throw new AudioError('This song did not match your musical direction.',422);
   if(this.commerce.product==='improvise'&&(typeof output.lyrics!=='string'||!output.lyrics.trim()||output.lyrics.length>8000||!output.arrangement||typeof output.arrangement!=='object'))throw new AudioError('The finished song could not be verified.',422);
   const savedPlan=this.commerce.product==='music-dna'?plan:{title:'Your new song',language:{code:'auto',label:'Automatic'},cases:[{lyrics:output.lyrics??''}],arrangement:output.arrangement};
   await this.commerce.finish(id,'completed',{title:String(savedPlan.title).slice(0,120),language:savedPlan.language?.code??'en',direction:this.commerce.product==='music-dna'?musicDirection(row.profile)!.label:String(row.profile.genre),audio,plan:savedPlan},estimate);
   await this.cleanup(run);
  }catch(error){
   // Invalid output is terminal, but network/storage failures retain the receipt for safe retry.
   if(error instanceof AudioError&&error.status===422){await this.commerce.finish(id,'failed');await this.cleanup(run);}
   else throw error;
  }finally{await pool.query('UPDATE cloud_song_runs SET lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2',[id,token]);}
 }
 private async cleanup(run:any){
  await this.commerce.store!.remove(run.output_key);
  if(run.source_id){const source=(await this.commerce.pool.query('SELECT object_key FROM song_uploads WHERE id=$1',[run.source_id])).rows[0];if(source)await this.commerce.store!.remove(source.object_key);}
  await this.commerce.pool.query('UPDATE cloud_song_runs SET cleanup_at=now() WHERE id=$1',[run.id]);
 }
 async sweep(){
  const rows=(await this.commerce.pool.query(`SELECT c.id FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE c.cleanup_at IS NULL AND d.product=$1 AND d.billing_live=$2 AND c.endpoint=$3 ORDER BY c.updated_at LIMIT 2`,[this.commerce.product,!!this.commerce.options.live,this.config.endpoint])).rows;
  let pending=0;await Promise.all(rows.map(async row=>{try{await this.tick(row.id);}catch{pending++;}}));
  const uploads=(await this.commerce.pool.query('SELECT s.id,s.object_key FROM song_uploads s WHERE s.expires_at<now() AND NOT EXISTS(SELECT 1 FROM cloud_song_runs c WHERE c.source_id=s.id) LIMIT 20')).rows;
  for(const upload of uploads){await this.commerce.store!.remove(upload.object_key);await this.commerce.pool.query('DELETE FROM song_uploads WHERE id=$1',[upload.id]);}
  return {checked:rows.length,pending};
 }
}
