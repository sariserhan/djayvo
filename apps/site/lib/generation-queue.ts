import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {Wallet} from './wallet';
import {integer} from './economics';
import {signPermit,type WorkerPermit} from './generation-budget';

// Expired work is never re-queued: a second worker could double rental costs.
export class GenerationQueue {
 constructor(private pool:Pool,private secret:string){}
 async claim(worker:string){
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(worker))throw new Error('Invalid worker');
  const db=await this.pool.connect();
  try{await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-generation-capacity',0))");
   // Start with one allocation globally, including allocations awaiting shutdown reconciliation.
   if((await db.query("SELECT 1 FROM generation_jobs WHERE state IN ('running','stopping') LIMIT 1")).rowCount){await db.query('COMMIT');return null;}
   const job=(await db.query(`SELECT j.*,r.cost_cap_micros FROM generation_jobs j
    JOIN generation_reservations r ON r.id=j.reservation_id JOIN credit_wallets w ON w.owner_id=j.owner_id
    WHERE j.state='queued' AND NOT j.cancel_requested AND NOT w.frozen AND r.status='reserved'
    ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`)).rows[0];
   if(!job){await db.query('COMMIT');return null;}
   const token=randomUUID(),now=Date.now(),permit:WorkerPermit={...job.budget,version:1,reservationId:job.reservation_id,
    expiresAt:now+job.budget.maxRuntimeMs,maxRuntimeMs:job.budget.maxRuntimeMs,costCapMicros:Number(job.cost_cap_micros),attempt:1};
   const signed=signPermit(permit,this.secret,now);
   await db.query(`UPDATE generation_jobs SET state='running',worker_id=$1,lease_token=$2,started_at=now(),
    deadline=to_timestamp($3/1000.0),lease_until=least(now()+interval '15 seconds',to_timestamp($3/1000.0)) WHERE reservation_id=$4`,[worker,token,permit.expiresAt,job.reservation_id]);
   await db.query("UPDATE generation_reservations SET status='running' WHERE id=$1",[job.reservation_id]);
   await db.query('COMMIT');return {id:job.reservation_id as string,leaseToken:token,permit:signed};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async heartbeat(id:string,token:string){
  const result=await this.pool.query(`UPDATE generation_jobs SET lease_until=least(now()+interval '15 seconds',deadline)
   WHERE reservation_id=$1 AND lease_token=$2 AND state='running' AND NOT cancel_requested AND lease_until>now() AND deadline>now()
   RETURNING reservation_id`,[id,token]);return !!result.rowCount;
 }
 async cancel(owner:string,id:string){
  const result=await this.pool.query(`UPDATE generation_jobs SET cancel_requested=true,
   state=CASE WHEN state='queued' THEN 'cancelled' ELSE 'stopping' END,
   actual_cost_micros=CASE WHEN state='queued' THEN 0 ELSE actual_cost_micros END,
   stop_confirmed_at=CASE WHEN state='queued' THEN now() ELSE stop_confirmed_at END
   WHERE reservation_id=$1 AND owner_id=$2 AND state IN ('queued','running','stopping') RETURNING state`,[id,owner]);
  if(!result.rowCount)throw new Error('Unknown or terminal job');
  if(result.rows[0].state==='cancelled')await this.reconcile(id);
 }
 async shutdownRequired(){
  await this.pool.query("UPDATE generation_jobs SET state='stopping' WHERE state='running' AND (cancel_requested OR lease_until<=now() OR deadline<=now())");
  // No raw media, credentials, or lease tokens are returned to watchdog logs.
  return (await this.pool.query("SELECT reservation_id,worker_id,deadline FROM generation_jobs WHERE state='stopping' ORDER BY created_at LIMIT 100")).rows;
 }
 async stopped(id:string,token:string,actual:number,status:'completed'|'failed'|'cancelled',outputSha?:string){
  integer(actual);if(!['completed','failed','cancelled'].includes(status)||status==='completed'&&!/^[0-9a-f]{64}$/.test(outputSha??''))throw new Error('Invalid result');
  const db=await this.pool.connect();
  try{await db.query('BEGIN');
   const job=(await db.query(`SELECT j.*,r.cost_cap_micros FROM generation_jobs j JOIN generation_reservations r ON r.id=j.reservation_id
    WHERE j.reservation_id=$1 AND j.lease_token=$2 FOR UPDATE OF j`,[id,token])).rows[0];
   if(!job)throw new Error('Invalid worker lease');
   const rental=(await db.query('SELECT * FROM generation_rentals WHERE reservation_id=$1',[id])).rows[0];
   if(rental&&(!rental.destroy_confirmed_at||rental.final_cost_micros===null||Number(rental.final_cost_micros)!==actual))
    throw new Error('Provider shutdown and cost evidence required');
   if(job.stop_confirmed_at){
    if(job.state!==status||Number(job.actual_cost_micros)!==actual||job.output_sha256!==(outputSha??null))throw new Error('Result conflict');
   }else{
    if(actual>Number(job.cost_cap_micros))throw new Error('Cost ceiling exceeded; stop and reconcile manually');
    if(job.cancel_requested&&status==='completed')throw new Error('Cancellation requires reconciliation');
    await db.query(`UPDATE generation_jobs SET state=$1,actual_cost_micros=$2,output_sha256=$3,stop_confirmed_at=now()
     WHERE reservation_id=$4`,[status,actual,outputSha??null,id]);
   }
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  // Crash between these operations is recoverable; reservation remains held until reconciliation.
  await this.reconcile(id);
 }
 async reconcile(id:string){
  const job=(await this.pool.query('SELECT * FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0];
  if(!job?.stop_confirmed_at||!['completed','failed','cancelled'].includes(job.state))throw new Error('Shutdown not confirmed');
  await new Wallet(this.pool).settle(job.owner_id,id,Number(job.actual_cost_micros),job.state);
  await this.pool.query('UPDATE generation_jobs SET settled_at=now() WHERE reservation_id=$1 AND settled_at IS NULL',[id]);
 }
}
