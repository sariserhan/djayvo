import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { integer, privacyCredits, allocateCredits } from './economics';
import {adminAccount} from './admin-access';
import {validatePermit,type WorkerPermit} from './generation-budget';

export type JobBudget=Pick<WorkerPermit,'inputSha256'|'planSha256'|'maxRuntimeMs'|'hourlyMicros'|'fixedCostMicros'>;

type Purchase={provider:'stripe_test'|'stripe_live'|'apple_sandbox'|'apple_live';receipt:string;credits:number;netMicros:number};
export class Wallet {
  constructor(private pool:Pool,readonly live=false){}
  private async atomic<T>(owner:string,fn:(db:PoolClient)=>Promise<T>,allowFrozen=false,receiptKey?:string):Promise<T>{
    const db=await this.pool.connect();
    try{await db.query('BEGIN');
      if(receiptKey)await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[receiptKey]);
      await db.query('INSERT INTO credit_wallets(owner_id) VALUES($1) ON CONFLICT DO NOTHING',[owner]);
      const wallet=(await db.query('SELECT frozen FROM credit_wallets WHERE owner_id=$1 FOR UPDATE',[owner])).rows[0];
      if(!allowFrozen&&(await db.query('SELECT suspended FROM "user" WHERE id=$1 FOR SHARE',[owner])).rows[0]?.suspended)throw new Error('Account suspended');
      if(wallet.frozen&&!allowFrozen)throw new Error('Wallet frozen for reconciliation');
      const result=await fn(db);await db.query('COMMIT');return result;
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
  async balance(owner:string){return (await this.pool.query(`SELECT COALESCE(sum(available_delta),0)::int AS available,
    COALESCE(sum(reserved_delta),0)::int AS reserved FROM wallet_ledger_entries e JOIN credit_lots l ON l.id=e.lot_id WHERE e.owner_id=$1 AND (l.provider IN ('stripe_live','apple_live'))=$2`,[owner,this.live])).rows[0];}
  async accountToken(owner:string){return this.atomic(owner,async db=>(await db.query('SELECT app_account_token FROM credit_wallets WHERE owner_id=$1',[owner])).rows[0].app_account_token as string);}
  // Only verified provider adapters may call grant; there is no client grant endpoint.
  async grant(owner:string,p:Purchase){
    integer(p.credits,1,100000);integer(p.netMicros,p.credits);
    if(!['stripe_test','stripe_live','apple_sandbox','apple_live'].includes(p.provider)||(['stripe_live','apple_live'].includes(p.provider))!==this.live||!p.receipt||p.receipt.length>255)throw new Error('Invalid receipt');
    return this.atomic(owner,async db=>{
      if((await db.query('SELECT 1 FROM purchase_holds WHERE provider=$1 AND receipt=$2',[p.provider,p.receipt])).rowCount)throw new Error('Purchase held for reconciliation');
      const result=await db.query(`INSERT INTO credit_lots(owner_id,provider,receipt,credits,net_micros)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(provider,receipt) DO NOTHING RETURNING id`,[owner,p.provider,p.receipt,p.credits,p.netMicros]);
      if(!result.rowCount){
        const prior=(await db.query('SELECT * FROM credit_lots WHERE provider=$1 AND receipt=$2',[p.provider,p.receipt])).rows[0];
        if(prior.owner_id!==owner||prior.credits!==p.credits||Number(prior.net_micros)!==p.netMicros)throw new Error('Receipt conflict');
        return prior.id as string;
      }
      const id=result.rows[0].id;
      await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES($1,$2,'grant',$3,0)",[owner,id,p.credits]);return id as string;
    },false,`${p.provider}:${p.receipt}`);
  }
  async quote(owner:string,cap:number,marginBps=5000,visibility:'public'|'private'='public'){
    integer(cap,1,5_000_000);integer(marginBps,3000,9000);
    if(!['public','private'].includes(visibility))throw new Error('Invalid visibility');
    return this.atomic(owner,async db=>{
      const exempt=await adminAccount(db,owner);
      const lots=exempt?[]:(await db.query(`SELECT l.id,l.net_micros,l.credits,COALESCE(sum(e.available_delta),0)::int AS available
        FROM credit_lots l JOIN wallet_ledger_entries e ON e.lot_id=l.id WHERE l.owner_id=$1 AND (l.provider IN ('stripe_live','apple_live'))=$2
        GROUP BY l.id ORDER BY l.created_at,l.id`,[owner,this.live])).rows;
      const allocations=exempt?[]:allocateCredits(lots,cap,marginBps,visibility==='private');
      return {credits:allocations.reduce((sum,a)=>sum+a.n,0),privacyCredits:allocations.reduce((sum,a)=>sum+a.privacy,0),
        costCapMicros:cap,marginBps,visibility,creditExempt:exempt};
    });
  }
  async reserve(owner:string,key:string,cap:number,marginBps=5000,job?:JobBudget,visibility?:'public'|'private',expectedCredits?:number,record?:{fingerprint:string;save:(db:PoolClient,id:string)=>Promise<void>}){
    if(visibility!==undefined && !['public','private'].includes(visibility))throw new Error('Invalid visibility');
    if(expectedCredits!==undefined)integer(expectedCredits,0,100000);
    const privacyBps=visibility==='private'?2500:0;
    integer(cap,1,5_000_000);integer(marginBps,3000,9000);
    if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new Error('Invalid request key');
    if(job)validatePermit({...job,version:1,reservationId:'00000000-0000-0000-0000-000000000000',expiresAt:Date.now()+60000,costCapMicros:cap,attempt:1},Date.now());
    const fingerprint=createHash('sha256').update(JSON.stringify({cap,marginBps,job,...(visibility?{visibility}: {}),...(expectedCredits!==undefined?{expectedCredits}:{}),...(record?{record:record.fingerprint}:{})})).digest('hex');
    return this.atomic(owner,async db=>{
      const prior=(await db.query('SELECT * FROM generation_reservations WHERE owner_id=$1 AND request_key=$2',[owner,key])).rows[0];
      if(prior){if(prior.fingerprint!==fingerprint)throw new Error('Changed quote');return prior.id as string;}
      if((await db.query("SELECT 1 FROM generation_reservations WHERE owner_id=$1 AND status IN ('reserved','running')",[owner])).rowCount)throw new Error('One active job per user');
      const daily=(await db.query("SELECT COALESCE(sum(COALESCE(actual_cost_micros,cost_cap_micros)),0) AS cost FROM generation_reservations WHERE owner_id=$1 AND created_at>now()-interval '24 hours'",[owner])).rows[0];
      if(Number(daily.cost)+cap>10_000_000)throw new Error('Daily cost ceiling');
      const exempt=await adminAccount(db,owner);
      const lots=exempt?[]:(await db.query(`SELECT l.id,l.net_micros,l.credits,COALESCE(sum(e.available_delta),0)::int AS available
        FROM credit_lots l JOIN wallet_ledger_entries e ON e.lot_id=l.id WHERE l.owner_id=$1 AND (l.provider IN ('stripe_live','apple_live'))=$2
        GROUP BY l.id ORDER BY l.created_at,l.id`,[owner,this.live])).rows;
      const allocations=exempt?[]:allocateCredits(lots,cap,marginBps,!!privacyBps);
      const credits=allocations.reduce((sum,a)=>sum+a.n,0);
      if(expectedCredits!==undefined && credits!==expectedCredits)throw new Error('Quote changed; request a new quote');
      const id=(await db.query(`INSERT INTO generation_reservations(owner_id,request_key,fingerprint,status,cost_cap_micros,margin_bps,credit_exempt,visibility,privacy_surcharge_bps)
        VALUES($1,$2,$3,'reserved',$4,$5,$6,$7,$8) RETURNING id`,[owner,key,fingerprint,cap,marginBps,exempt,visibility??'public',privacyBps])).rows[0].id;
      if(exempt)await db.query("INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,'credits.exempt-reservation',$2,$3)",[owner,id,JSON.stringify({costCapMicros:cap})]);
      for(const a of allocations){
        await db.query('INSERT INTO credit_allocations(reservation_id,lot_id,owner_id,credits,net_per_credit,privacy_credits) VALUES($1,$2,$3,$4,$5,$6)',[id,a.id,owner,a.n,a.net,a.privacy]);
        await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,reservation_id,kind,available_delta,reserved_delta) VALUES($1,$2,$3,'reserve',$4,$5)",[owner,a.id,id,-a.n,a.n]);
      }
      if(job)await db.query('INSERT INTO generation_jobs(reservation_id,owner_id,input_sha256,plan_sha256,budget) VALUES($1,$2,$3,$4,$5)',[id,owner,job.inputSha256,job.planSha256,JSON.stringify(job)]);
      if(record)await record.save(db,id);
      return id as string;
    });
  }
  async settle(owner:string,id:string,actual:number,status:'completed'|'failed'|'cancelled'){
    integer(actual);if(!['completed','failed','cancelled'].includes(status))throw new Error('Invalid terminal state');
    return this.atomic(owner,async db=>{
      const job=(await db.query('SELECT * FROM generation_reservations WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0];
      if(!job)throw new Error('Unknown reservation');
      const worker=(await db.query('SELECT stop_confirmed_at,state,actual_cost_micros FROM generation_jobs WHERE reservation_id=$1',[id])).rows[0];
      if(worker&&(!worker.stop_confirmed_at||worker.state!==status||Number(worker.actual_cost_micros)!==actual))throw new Error('Worker shutdown not reconciled');
      if(actual>Number(job.cost_cap_micros))throw new Error('Cost ceiling exceeded; reconciliation required');
      if(job.actual_cost_micros!==null){if(Number(job.actual_cost_micros)!==actual||job.status!==status)throw new Error('Settlement conflict');return;}
      let remaining=BigInt(actual)*10000n;
      const allocations=(await db.query('SELECT * FROM credit_allocations WHERE reservation_id=$1 ORDER BY lot_id',[id])).rows;
      const captures=allocations.map(a=>{
        const budget=BigInt(a.net_per_credit)*BigInt(10000-job.margin_bps);
        const base=Math.min(a.credits-a.privacy_credits,Number((remaining+budget-1n)/budget));
        remaining=remaining>BigInt(base)*budget?remaining-BigInt(base)*budget:0n;
        return {a,base};
      });
      let extra=job.privacy_surcharge_bps && status==='completed'?privacyCredits(captures.reduce((sum,c)=>sum+c.base,0)):0;
      for(const {a,base} of captures){
        const premium=Math.min(extra,a.privacy_credits);extra-=premium;
        const capture=base+premium,release=a.credits-capture;
        if(capture)await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,reservation_id,kind,available_delta,reserved_delta) VALUES($1,$2,$3,'capture',0,$4)",[owner,a.lot_id,id,-capture]);
        if(release)await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,reservation_id,kind,available_delta,reserved_delta) VALUES($1,$2,$3,'release',$4,$5)",[owner,a.lot_id,id,release,-release]);
        if(release&&(await db.query('SELECT 1 FROM credit_lots l JOIN purchase_holds h ON h.provider=l.provider AND h.receipt=l.receipt WHERE l.id=$1',[a.lot_id])).rowCount)
          await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES($1,$2,'refund',$3,0)",[owner,a.lot_id,-release]);
      }
      if(extra)throw new Error('Privacy premium not funded');
      if(!job.credit_exempt&&remaining>0n)throw new Error('Settlement not funded');
      await db.query('UPDATE generation_reservations SET status=$1,actual_cost_micros=$2 WHERE id=$3',[status,actual,id]);
    },true);
  }
  async freezePurchase(provider:string,receipt:string){
    if(!['stripe_test','stripe_live','apple_sandbox','apple_live'].includes(provider)||(['stripe_live','apple_live'].includes(provider))!==this.live||!receipt||receipt.length>255)throw new Error('Invalid receipt');
    const db=await this.pool.connect();
    try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${provider}:${receipt}`]);
      await db.query('INSERT INTO purchase_holds(provider,receipt) VALUES($1,$2) ON CONFLICT DO NOTHING',[provider,receipt]);
      await db.query('UPDATE credit_wallets SET frozen=true WHERE owner_id IN (SELECT owner_id FROM credit_lots WHERE provider=$1 AND receipt=$2)',[provider,receipt]);
      const lots=(await db.query(`SELECT l.id,l.owner_id,COALESCE(sum(e.available_delta),0)::int AS available
        FROM credit_lots l JOIN wallet_ledger_entries e ON e.lot_id=l.id WHERE l.provider=$1 AND l.receipt=$2 GROUP BY l.id`,[provider,receipt])).rows;
      for(const lot of lots)if(lot.available>0)await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES($1,$2,'refund',$3,0)",[lot.owner_id,lot.id,-lot.available]);
      await db.query("UPDATE generation_jobs SET cancel_requested=true,state='stopping' WHERE owner_id IN (SELECT owner_id FROM credit_lots WHERE provider=$1 AND receipt=$2) AND state IN ('running','stopping')",[provider,receipt]);
      await db.query('COMMIT');
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
}
