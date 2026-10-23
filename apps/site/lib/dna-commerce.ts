import {createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {Wallet} from './wallet';
import {signQuote,verifyQuote} from './generation-quote';
import {AudioError} from './audio-validation';
import type {AudioStore} from './audio-store';
import {musicAudioKey} from './music-storage';

export type DnaVisibility='public'|'private';
export type DnaContext={commerce:DnaCommerce;owner:string|null;readOnly?:boolean};
export type SongCommerceOptions={product?:'music-dna'|'improvise';live?:boolean;budget?:{costCapMicros:number;maxRuntimeMs:number;hourlyMicros:number;fixedCostMicros:number}};
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
 constructor(readonly pool:Pool,private secret:string,readonly store?:AudioStore,readonly options:SongCommerceOptions={}){this.wallet=new Wallet(pool,options.live);}
 get product(){return this.options.product??'music-dna';}
 async quote(owner:string,profile:unknown,visibility:DnaVisibility){
  const budget=this.options.budget??{costCapMicros:COST_CAP,maxRuntimeMs:DNA_RUNTIME_MS,hourlyMicros:100000,fixedCostMicros:25000};
  const price=await this.wallet.quote(owner,budget.costCapMicros,5000,visibility);
  const quote={version:1 as const,owner,expiresAt:Date.now()+300000,...price,
   job:{inputSha256:hash(profile),planSha256:hash([this.product+'-v1',visibility,!!this.options.live]),maxRuntimeMs:budget.maxRuntimeMs,hourlyMicros:budget.hourlyMicros,fixedCostMicros:budget.fixedCostMicros}};
  return {...price,expiresAt:quote.expiresAt,token:signQuote(quote,this.secret),mode:this.options.budget?'cloud':'local_credit_rehearsal'};
 }
 async submit(owner:string,id:string,profile:unknown,visibility:DnaVisibility,token:string,save?:(db:PoolClient)=>Promise<void>){
  if(!/^[a-f0-9]{32}$/.test(id))throw new AudioError('Invalid song request.');
  const q=verifyQuote(token,owner,this.secret);
  if(q.visibility!==visibility||q.job.inputSha256!==hash(profile)||q.job.planSha256!==hash([this.product+'-v1',visibility,!!this.options.live])||q.costCapMicros!==(this.options.budget?.costCapMicros??COST_CAP))
   throw new AudioError('Your list or sharing choice changed. Get a new quote.');
  await this.wallet.reserve(owner,'dna_'+id,q.costCapMicros,q.marginBps,undefined,visibility,q.credits,{
   fingerprint:hash([profile,visibility,this.product,!!this.options.live]),save:async(db,reservation)=>{
    await db.query(`INSERT INTO dna_song_jobs(id,owner_id,reservation_id,profile,visibility,public_consent_at,cost_cap_micros,quoted_credits,product,billing_live)
     VALUES($1,$2,$3,$4,$5,CASE WHEN $5='public' THEN now() ELSE NULL END,$6,$7,$8,$9)`,[id,owner,reservation,JSON.stringify(profile),visibility,q.costCapMicros,q.credits,this.product,!!this.options.live]);
    if(save)await save(db);
   }});
  return this.row(id);
 }
 async row(id:string){return (await this.pool.query('SELECT * FROM dna_song_jobs WHERE id=$1 AND product=$2 AND billing_live=$3',[id,this.product,!!this.options.live])).rows[0];}
 async pending(owner:string){return (await this.pool.query("SELECT id FROM dna_song_jobs WHERE owner_id=$1 AND product=$2 AND billing_live=$3 AND state IN ('queued','running') ORDER BY created_at LIMIT 20",[owner,this.product,!!this.options.live])).rows as {id:string}[];}
 async start(id:string){return !!(await this.pool.query(`UPDATE dna_song_jobs d SET state='running',started_at=now()
  FROM credit_wallets w,"user" u WHERE d.id=$1 AND d.product=$2 AND d.billing_live=$3 AND d.state='queued' AND w.owner_id=d.owner_id AND NOT w.frozen AND u.id=d.owner_id AND NOT u.suspended RETURNING d.id`,[id,this.product,!!this.options.live])).rowCount;}
 async finish(id:string,state:'completed'|'failed'|'cancelled',details?:{title:string;language:string;direction:string;audio?:Buffer;plan?:unknown},settlementCost?:number){
  const row=await this.row(id);if(!row)throw new AudioError('Song not found.',404);
  if(state==='completed'&&(!details?.title||!details.language||!details.direction))throw Error('Checked song metadata required');
  if(state==='completed'&&this.store){
   const audio=details!.audio;
   if(!row.audio_key){
    if(!audio||audio.length<44||audio.length>24_000_000||audio.toString('ascii',0,4)!=='RIFF'||!details!.plan)throw Error('Checked song audio and plan required before completion');
    const sha256=createHash('sha256').update(audio).digest('hex'),key=musicAudioKey(this.product,row.visibility,id,sha256);
    await this.store.put(key,audio);
    if(createHash('sha256').update(await this.store.get(key,audio.length)).digest('hex')!==sha256)throw Error('Stored song verification failed');
    await this.pool.query(`UPDATE dna_song_jobs SET audio_key=$2,audio_sha256=$3,audio_bytes=$4,song_plan=$5
     WHERE id=$1 AND audio_key IS NULL AND state IN ('queued','running')`,[id,key,sha256,audio.length,JSON.stringify(details!.plan)]);
    const saved=await this.row(id);if(saved.audio_key!==key)throw Error('Song storage receipt changed');
   }else if(audio&&createHash('sha256').update(audio).digest('hex')!==row.audio_sha256)throw Error('Song storage receipt changed');
  }
  // Retry settlement before exposing a song; a crash here must never cause a second charge or render.
  await this.wallet.settle(row.owner_id,row.reservation_id,state==='completed'?(settlementCost??Number(row.cost_cap_micros)):0,state);
  await this.pool.query(`UPDATE dna_song_jobs SET state=$2,title=$3,language=$4,direction=$5,completed_at=now()
   WHERE id=$1 AND state IN ('queued','running',$2)`,[id,state,details?.title??null,details?.language??null,details?.direction??null]);
 }
 async withdraw(owner:string,id:string){
  if(!(await this.pool.query("UPDATE dna_song_jobs SET withdrawn_at=now() WHERE id=$1 AND owner_id=$2 AND product=$3 AND billing_live=$4 AND state='completed'",[id,owner,this.product,!!this.options.live])).rowCount)
   throw new AudioError('Song not found.',404);
 }
 async list(owner:string|null,scope:'mine'|'public',after='',filters={language:'',genre:''}){
  if(after&&!/^[a-f0-9]{32}$/.test(after))throw new AudioError('Invalid song cursor.');
  if(filters.language.length>50||filters.genre.length>100)throw new AudioError('Invalid song filters.');
  const result=(await this.pool.query(`WITH visible AS (
   SELECT d.id,d.title,d.language,d.direction,d.visibility,d.withdrawn_at,d.created_at
   FROM dna_song_jobs d JOIN generation_reservations r ON r.id=d.reservation_id
   WHERE d.state='completed' AND r.status='completed' AND d.product=$4 AND d.billing_live=$5
   AND (($1='mine' AND d.owner_id=$2) OR ($1='public' AND d.visibility='public' AND d.public_consent_at IS NOT NULL AND d.withdrawn_at IS NULL))
  ), page AS (
   SELECT * FROM visible WHERE ($6='' OR language=$6) AND ($7='' OR direction=$7)
   AND ($3='' OR (created_at,id)<(SELECT created_at,id FROM visible WHERE id=$3))
   ORDER BY created_at DESC,id DESC LIMIT 25
  ) SELECT COALESCE((SELECT json_agg(page ORDER BY created_at DESC,id DESC) FROM page),'[]') AS songs,
   ARRAY(SELECT DISTINCT language FROM visible WHERE language IS NOT NULL ORDER BY language) AS languages,
   ARRAY(SELECT DISTINCT direction FROM visible WHERE direction IS NOT NULL ORDER BY direction) AS genres`,
   [scope,owner,after,this.product,!!this.options.live,filters.language,filters.genre])).rows[0];
  const rows: {id:string;title:string;language:string;direction:string;visibility:DnaVisibility;withdrawn_at:string|null;created_at:string}[]=result.songs;
  return {songs:rows.slice(0,24),next:rows.length>24?rows[23].id:null,filters:{languages:result.languages,genres:result.genres}};
 }
}
