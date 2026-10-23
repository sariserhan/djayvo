import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {Wallet} from './wallet';
import {signQuote,verifyQuote} from './generation-quote';
import {AudioError} from './audio-validation';

export type DnaVisibility='public'|'private';
export type DnaContext={commerce:DnaCommerce;owner:string|null};
export const DNA_RUNTIME_MS=15*60*1000;
// Local rehearsal cost ceiling, not a cloud-provider price. Production generation stays closed.
const COST_CAP=50_000;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function visibilityInput(value:unknown,consent:unknown):DnaVisibility{
 if(value!=='public'&&value!=='private')throw new AudioError('Choose public or private.');
 if(value==='public'&&consent!==true)throw new AudioError('Agree to share this song publicly, or choose Private.');
 if(value==='private'&&consent===true)throw new AudioError('Private songs cannot request public sharing.');
 return value;
}
export class DnaCommerce{
 readonly wallet:Wallet;
 constructor(readonly pool:Pool,private secret:string){this.wallet=new Wallet(pool);}
 async quote(owner:string,profile:unknown,visibility:DnaVisibility){
  const price=await this.wallet.quote(owner,COST_CAP,5000,visibility);
  const quote={version:1 as const,owner,expiresAt:Date.now()+300000,...price,
   job:{inputSha256:hash(profile),planSha256:hash(['music-dna-v1',visibility]),maxRuntimeMs:DNA_RUNTIME_MS,hourlyMicros:100000,fixedCostMicros:25000}};
  return {...price,expiresAt:quote.expiresAt,token:signQuote(quote,this.secret),mode:'local_credit_rehearsal'};
 }
 async submit(owner:string,id:string,profile:unknown,visibility:DnaVisibility,token:string){
  if(!/^[a-f0-9]{32}$/.test(id))throw new AudioError('Invalid song request.');
  const q=verifyQuote(token,owner,this.secret);
  if(q.visibility!==visibility||q.job.inputSha256!==hash(profile)||q.job.planSha256!==hash(['music-dna-v1',visibility])||q.costCapMicros!==COST_CAP)
   throw new AudioError('Your list or sharing choice changed. Get a new quote.');
  await this.wallet.reserve(owner,'dna_'+id,q.costCapMicros,q.marginBps,undefined,visibility,q.credits,{
   fingerprint:hash([profile,visibility]),save:async(db,reservation)=>{
    await db.query(`INSERT INTO dna_song_jobs(id,owner_id,reservation_id,profile,visibility,public_consent_at,cost_cap_micros,quoted_credits)
     VALUES($1,$2,$3,$4,$5,CASE WHEN $5='public' THEN now() ELSE NULL END,$6,$7)`,[id,owner,reservation,JSON.stringify(profile),visibility,q.costCapMicros,q.credits]);
   }});
  return this.row(id);
 }
 async row(id:string){return (await this.pool.query('SELECT * FROM dna_song_jobs WHERE id=$1',[id])).rows[0];}
 async pending(owner:string){return (await this.pool.query("SELECT id FROM dna_song_jobs WHERE owner_id=$1 AND state IN ('queued','running') ORDER BY created_at LIMIT 20",[owner])).rows as {id:string}[];}
 async start(id:string){return !!(await this.pool.query(`UPDATE dna_song_jobs d SET state='running',started_at=now()
  FROM credit_wallets w,"user" u WHERE d.id=$1 AND d.state='queued' AND w.owner_id=d.owner_id AND NOT w.frozen AND u.id=d.owner_id AND NOT u.suspended RETURNING d.id`,[id])).rowCount;}
 async finish(id:string,state:'completed'|'failed'|'cancelled',details?:{title:string;language:string;direction:string}){
  const row=await this.row(id);if(!row)throw new AudioError('Song not found.',404);
  if(state==='completed'&&(!details?.title||!details.language||!details.direction))throw Error('Checked song metadata required');
  // Retry settlement before exposing a song; a crash here must never cause a second charge or render.
  await this.wallet.settle(row.owner_id,row.reservation_id,state==='completed'?Number(row.cost_cap_micros):0,state);
  await this.pool.query(`UPDATE dna_song_jobs SET state=$2,title=$3,language=$4,direction=$5,completed_at=now()
   WHERE id=$1 AND state IN ('queued','running',$2)`,[id,state,details?.title??null,details?.language??null,details?.direction??null]);
 }
 async withdraw(owner:string,id:string){
  if(!(await this.pool.query("UPDATE dna_song_jobs SET withdrawn_at=now() WHERE id=$1 AND owner_id=$2 AND state='completed'",[id,owner])).rowCount)
   throw new AudioError('Song not found.',404);
 }
 async list(owner:string|null,scope:'mine'|'public',after=''){
  if(after&&!/^[a-f0-9]{32}$/.test(after))throw new AudioError('Invalid song cursor.');
  const rows=(await this.pool.query(`SELECT d.id,d.title,d.language,d.direction,d.visibility,d.withdrawn_at,d.created_at
   FROM dna_song_jobs d JOIN generation_reservations r ON r.id=d.reservation_id
   WHERE d.state='completed' AND r.status='completed'
   AND (($1='mine' AND d.owner_id=$2) OR ($1='public' AND d.visibility='public' AND d.public_consent_at IS NOT NULL AND d.withdrawn_at IS NULL))
   AND ($3='' OR (d.created_at,d.id)<(SELECT created_at,id FROM dna_song_jobs WHERE id=$3))
   ORDER BY d.created_at DESC,d.id DESC LIMIT 25`,[scope,owner,after])).rows;
  return {songs:rows.slice(0,24),next:rows.length>24?rows[23].id:null};
 }
}
