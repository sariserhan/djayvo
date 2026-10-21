import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import type {AudioStore} from './audio-store';
import {validateWav,saveInput,uuid} from './audio-validation';
import {PrivateAudio} from './private-audio';
import {GenerationQueue} from './generation-queue';

// Trusted worker API only. No public route and no ability to allocate compute.
export class GenerationOutput {
 constructor(private pool:Pool,private store:AudioStore){}
 async stage(id:string,token:string,wav:Buffer,title:string,strategy:string){
  uuid(id);uuid(token);const sha256=createHash('sha256').update(wav).digest('hex');
  validateWav(wav,wav.length,sha256);
  const input=saveInput({requestId:id,title,strategy,bytes:wav.length,sha256,consent:true});
  const receipt={key:`uploads/${id}.wav`,sha256,bytes:wav.length,title:input.title,strategy:input.strategy};
  const db=await this.pool.connect();
  try{
   await db.query('BEGIN');
   const job=(await db.query(`SELECT *,lease_until>now() AND deadline>now() AS active FROM generation_jobs WHERE reservation_id=$1 AND lease_token=$2 FOR UPDATE`,[id,token])).rows[0];
   if(!job||job.cancel_requested||!['running','stopping'].includes(job.state)||job.worker_id==='local_cpp')throw Error('Active cloud worker required');
   const old=job.budget.output;
   if(old){if(Object.entries(receipt).some(([key,value])=>old[key]!==value))throw Error('Output receipt conflict');}
   else{if(!job.active||job.state!=='running')throw Error('Worker lease expired');
    await db.query(`UPDATE generation_jobs SET budget=jsonb_set(budget,'{output}',$2::jsonb) WHERE reservation_id=$1`,[id,JSON.stringify({...receipt,ready:false})]);}
   await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  // Durable identity precedes upload; a lost response may only retry these exact bytes.
  await this.store.put(receipt.key,wav);
  const stored=await this.store.get(receipt.key,receipt.bytes);validateWav(stored,receipt.bytes,receipt.sha256);
  const ready=await this.pool.query(`UPDATE generation_jobs SET budget=jsonb_set(budget,'{output,ready}','true')
   WHERE reservation_id=$1 AND lease_token=$2 AND NOT cancel_requested AND state IN ('running','stopping')`,[id,token]);
  if(!ready.rowCount)throw Error('Output staged but job stopped; reconcile before publication');
  return receipt;
 }
 async complete(id:string){
  uuid(id);const db=await this.pool.connect();let locked=false;
  try{
   locked=(await db.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',['jamloom-output-'+id])).rows[0].locked;
   if(!locked)throw Error('Output recovery already running');
   const job=(await db.query(`SELECT j.*,r.destroy_confirmed_at,r.final_cost_micros,r.cost_evidence_sha256,s.cost_cap_micros
    FROM generation_jobs j JOIN generation_rentals r USING(reservation_id)
    JOIN generation_reservations s ON s.id=j.reservation_id WHERE j.reservation_id=$1`,[id])).rows[0];
   if(!job||!job.destroy_confirmed_at||job.final_cost_micros===null||!job.cost_evidence_sha256)throw Error('Provider termination and final all-in cost evidence required');
   const cost=Number(job.final_cost_micros);if(!Number.isSafeInteger(cost)||cost<0||cost>Number(job.cost_cap_micros))throw Error('Provider cost exceeds reserved budget');
   const audio=new PrivateAudio(this.pool,this.store),queue=new GenerationQueue(this.pool,'');
   if(job.cancel_requested){
    const asset=(await db.query('SELECT track_id FROM track_assets WHERE owner_id=$1 AND request_id=$2',[job.owner_id,id])).rows[0];
    if(asset)await audio.remove(job.owner_id,asset.track_id);
    await queue.stopped(id,job.lease_token,cost,'cancelled');
    if(job.budget.output)await this.store.remove(`uploads/${id}.wav`);
    return {id,state:'cancelled'};
   }
   const output=job.budget.output;
   if(!output?.ready||output.key!==`uploads/${id}.wav`)throw Error('Completed output receipt required');
   const input=saveInput({requestId:id,title:output.title,strategy:output.strategy,bytes:output.bytes,sha256:output.sha256,consent:true});
   // A completed retry does not depend on temporary output retention.
   if(job.state==='completed'){await queue.reconcile(id);await this.store.remove(output.key);return {id,state:'completed',sha256:output.sha256};}
   if(!['running','stopping'].includes(job.state))throw Error('Job is terminal');
   const wav=await this.store.get(output.key,input.bytes);validateWav(wav,input.bytes,input.sha256);
   const saved=await audio.reserve(job.owner_id,{requestId:id,title:input.title,strategy:input.strategy,bytes:input.bytes,sha256:input.sha256,consent:true},true);
   if(!saved.ready){await audio.generatedUpload(job.owner_id,saved.id,wav);await audio.finalize(job.owner_id,saved.id);}
   try{await queue.stopped(id,job.lease_token,cost,'completed',output.sha256);}
   catch(error){if((await db.query('SELECT cancel_requested FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0]?.cancel_requested)await audio.remove(job.owner_id,saved.id);throw error;}
   await this.store.remove(output.key);
   return {id,state:'completed',outputId:saved.id,sha256:output.sha256};
  }finally{try{if(locked)await db.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',['jamloom-output-'+id]);}finally{db.release();}}
 }
}
