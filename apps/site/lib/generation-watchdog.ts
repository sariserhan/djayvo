import type {Pool} from 'pg';
import {integer} from './economics';
import {GenerationQueue} from './generation-queue';
import type {RentalProvider} from './vast-provider';

export class GenerationWatchdog {
 constructor(private pool:Pool,private provider:RentalProvider){}
 // The trusted launcher must persist intent BEFORE submitting a creation request.
 async prepare(id:string,token:string,account:number){
  integer(account,1);const db=await this.pool.connect();
  try{
   await db.query('BEGIN');
   const job=(await db.query(`SELECT * FROM generation_jobs WHERE reservation_id=$1 AND lease_token=$2
    AND state='running' AND NOT cancel_requested AND lease_until>now() AND deadline>now() FOR UPDATE`,[id,token])).rows[0];
   if(!job)throw new Error('Active worker lease required');
   await db.query(`INSERT INTO generation_rentals(reservation_id,account_id,label) VALUES($1,$2,$3)
    ON CONFLICT(reservation_id) DO NOTHING`,[id,account,'jamloom-job-'+id]);
   const rental=(await db.query('SELECT * FROM generation_rentals WHERE reservation_id=$1',[id])).rows[0];
   if(Number(rental.account_id)!==account)throw new Error('Rental identity conflict');
   await db.query('COMMIT');return rental.label as string;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 // Only the trusted invoice reconciler may submit final all-in cost and retained evidence.
 async recordCost(id:string,actual:number,evidenceSha:string){
  integer(actual);if(!/^[0-9a-f]{64}$/.test(evidenceSha))throw new Error('Invalid cost evidence');
  const result=await this.pool.query(`UPDATE generation_rentals SET final_cost_micros=$2,cost_evidence_sha256=$3
   WHERE reservation_id=$1 AND destroy_confirmed_at IS NOT NULL
   AND (final_cost_micros IS NULL OR (final_cost_micros=$2 AND cost_evidence_sha256=$3)) RETURNING reservation_id`,[id,actual,evidenceSha]);
  if(!result.rowCount)throw new Error('Rental shutdown missing or cost evidence conflict');
 }
 async sweep(apply=false){
  const db=await this.pool.connect();let locked=false;
  const results:{id:string;status:string}[]=[];
  try{
   locked=(await db.query("SELECT pg_try_advisory_lock(hashtextextended('jamloom-rental-watchdog',0)) AS locked")).rows[0].locked;
   if(!locked)return [{id:'',status:'watchdog_busy'}];
   const queue=new GenerationQueue(this.pool,'');
   if(apply)await queue.shutdownRequired();
   const jobs=(await db.query(`SELECT r.*,j.reservation_id,j.lease_token,j.cancel_requested FROM generation_jobs j
    LEFT JOIN generation_rentals r USING(reservation_id)
    WHERE (j.state='stopping' OR (j.state='running' AND (j.cancel_requested OR j.lease_until<=now() OR j.deadline<=now())))
    ORDER BY j.created_at LIMIT 100`)).rows;
   for(const job of jobs){
    const id=job.reservation_id as string;
    if(!job.account_id){results.push({id,status:'unbound_manual_reconciliation'});continue;}
    if(!apply){results.push({id,status:'shutdown_required'});continue;}
    try{
     if(!job.destroy_confirmed_at){
      const instances=await this.provider.inventory(Number(job.account_id));
      const matches=instances.filter(i=>i.label===job.label||job.instance_id!==null&&i.id===Number(job.instance_id));
      if(matches.length>1||matches.length===1&&(matches[0].label!==job.label||job.instance_id!==null&&matches[0].id!==Number(job.instance_id))){
       results.push({id,status:'rental_identity_conflict'});continue;
      }
      if(matches.length===0){
       // No creation response and no observed instance is ambiguous, never proof of zero cost.
       if(job.instance_id===null){results.push({id,status:'creation_unresolved'});continue;}
       await db.query('UPDATE generation_rentals SET destroy_confirmed_at=now() WHERE reservation_id=$1 AND destroy_confirmed_at IS NULL',[id]);
      }else{
       const instance=matches[0];
       await db.query(`UPDATE generation_rentals SET instance_id=$2,destroy_requested_at=COALESCE(destroy_requested_at,now())
        WHERE reservation_id=$1`,[id,instance.id]);
       await this.provider.destroy(instance.id);
       // A successful DELETE alone is insufficient; a later complete inventory must confirm absence.
       results.push({id,status:'destroy_requested'});continue;
      }
     }
     if(job.final_cost_micros===null){results.push({id,status:'awaiting_cost_evidence'});continue;}
     await queue.stopped(id,job.lease_token,Number(job.final_cost_micros),job.cancel_requested?'cancelled':'failed');
     results.push({id,status:'settled'});
    }catch{
     // Keep credentials, user data and provider response bodies out of operational logs.
     results.push({id,status:'held_for_reconciliation'});
    }
   }
   // Recover a crash after queue terminal evidence was committed but before wallet settlement.
   if(apply)for(const job of (await db.query(`SELECT reservation_id FROM generation_jobs
    WHERE stop_confirmed_at IS NOT NULL AND settled_at IS NULL LIMIT 100`)).rows){
    try{await queue.reconcile(job.reservation_id);results.push({id:job.reservation_id,status:'settlement_recovered'});}
    catch{results.push({id:job.reservation_id,status:'held_for_reconciliation'});}
   }
   return results;
  }finally{
   try{if(locked)await db.query("SELECT pg_advisory_unlock(hashtextextended('jamloom-rental-watchdog',0))");}
   catch(e){db.release(true);throw e;}
   db.release();
  }
 }
}
