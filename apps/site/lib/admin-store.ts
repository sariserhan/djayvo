import {createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {adminAccount,OWNER_EMAIL} from './admin-access';
import {AudioError,uuid} from './audio-validation';
import {enqueueEmail} from './notifications';
import {settingsInput,invalidateSiteSettings} from './site-settings';
import {GenerationQueue} from './generation-queue';
import {billingReadiness} from './billing-mode';

function field(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))throw new AudioError('Check the message fields and length.');return v.trim();}
export function ticketInput(v:Record<string,unknown>){
 if(Object.keys(v).sort().join(',')!=='body,email,kind,name,subject'||(typeof v.kind!=='string'||!['contact','support'].includes(v.kind)))throw new AudioError('Invalid message.');
 if(['name','subject'].some(key=>typeof v[key]==='string'&&/[\r\n]/.test(v[key] as string)))throw new AudioError('Name and subject must each be one line.');
 const email=field(v.email,254).toLowerCase();if(!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email))throw new AudioError('Enter a valid email address.');
 return {kind:String(v.kind),name:field(v.name,80),email,subject:field(v.subject,120),body:field(v.body,5000)};
}
export class AdminStore{
 constructor(private pool:Pool,private origin:string){}
 private async change<T>(actor:string,action:string,target:string,run:(db:PoolClient)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');
   if(!await adminAccount(db,actor))throw new AudioError('Administrator access required.',403);
   const result=await run(db);await db.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor,action,target,JSON.stringify(result)]);
   await db.query('COMMIT');return result;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async settings(actor:string,value:Record<string,unknown>,env:Record<string,string|undefined>=process.env){
  const v=settingsInput(value);
  if(v.billing_mode==='live'&&!billingReadiness('live',env).configured)throw new AudioError('Configure the separate live Stripe keys, webhook secret and Academy product first.');
  const result=await this.change(actor,'site.settings','site',async db=>{
   const updated=await db.query(`UPDATE site_settings SET maintenance=$1,maintenance_message=$2,banner=$3,billing_mode=$4,
    revision=revision+1,updated_at=now() WHERE id=1 AND revision=$5 RETURNING revision`,[v.maintenance,v.maintenance_message,v.banner,v.billing_mode,v.revision]);
   if(!updated.rowCount)throw new AudioError('Settings changed in another tab. Refresh before saving.',409);
   return {...v,revision:updated.rows[0].revision};
  });invalidateSiteSettings();return result;
 }
 async user(actor:string,id:string,suspended:boolean){
  if(typeof suspended!=='boolean'||!id||id.length>128)throw new AudioError('Invalid user action.');
  const result=await this.change(actor,suspended?'user.suspend':'user.restore',id,async db=>{
   const user=(await db.query('SELECT email FROM "user" WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!user)throw new AudioError('User not found.',404);
   if(user.email.toLowerCase()===OWNER_EMAIL)throw new AudioError('The owner cannot be suspended.');
   await db.query('UPDATE "user" SET suspended=$2 WHERE id=$1',[id,suspended]);
   if(suspended){await db.query('DELETE FROM "session" WHERE "userId"=$1',[id]);
    await db.query("UPDATE generation_jobs SET cancel_requested=true WHERE owner_id=$1 AND state IN ('queued','running','stopping')",[id]);}
   return {suspended};
  });
  if(suspended){
   // Cancellation does not issue worker permits; queued jobs settle without renting compute.
   const queue=new GenerationQueue(this.pool,'');
   for(const job of (await this.pool.query("SELECT reservation_id FROM generation_jobs WHERE owner_id=$1 AND state='queued'",[id])).rows)await queue.cancel(id,job.reservation_id);
  }return result;
 }
 async contact(value:Record<string,unknown>,ip:string,owner?:string){
  const v=ticketInput(value),db=await this.pool.connect();try{await db.query('BEGIN');
   await db.query("DELETE FROM contact_rate_limits WHERE window_start<now()-interval '1 day'");
   for(const key of ['ip:'+ip,'email:'+v.email]){
    const hashed=createHash('sha256').update(key).digest('hex');
    const r=await db.query(`INSERT INTO contact_rate_limits(key,count) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET
     count=CASE WHEN contact_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE contact_rate_limits.count+1 END,
     window_start=CASE WHEN contact_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE contact_rate_limits.window_start END
     WHERE contact_rate_limits.window_start<now()-interval '1 hour' OR contact_rate_limits.count<5 RETURNING count`,[hashed]);
    if(!r.rowCount)throw new AudioError('Too many messages. Please try again in an hour.',429);
   }
   const row=(await db.query('INSERT INTO support_tickets(kind,owner_id,name,email,subject,body) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[v.kind,owner??null,v.name,v.email,v.subject,v.body])).rows[0];
   await enqueueEmail(db,'ticket:'+row.id,{to:OWNER_EMAIL,subject:`New Jamloom ${v.kind} message`,text:`Reference: ${row.id}\nFrom: ${v.name} <${v.email}>\nSubject: ${v.subject}\n\n${v.body}`,
    action:{label:'Open message',url:this.origin+'/admin/inbox/'+row.id}});
   await db.query('COMMIT');return {id:row.id};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async ticket(actor:string,id:string,value:Record<string,unknown>){
  uuid(id);if(Object.keys(value).sort().join(',')!=='body,revision,status'||(typeof value.status!=='string'||!['open','closed'].includes(value.status))||!Number.isSafeInteger(value.revision)||typeof value.body!=='string'||value.body.length>5000)throw new AudioError('Invalid ticket update.');
  const body=value.body.trim();if(body)field(body,5000);
  return this.change(actor,body?'ticket.reply':'ticket.status',id,async db=>{
   const ticket=(await db.query('SELECT * FROM support_tickets WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!ticket)throw new AudioError('Message not found.',404);if(ticket.revision!==value.revision)throw new AudioError('Message changed. Refresh before replying.',409);
   await db.query('UPDATE support_tickets SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1',[id,value.status]);
   if(body){const reply=(await db.query('INSERT INTO support_replies(ticket_id,actor_id,body) VALUES($1,$2,$3) RETURNING id',[id,actor,body])).rows[0];
    await enqueueEmail(db,'reply:'+reply.id,{to:ticket.email,subject:'Jamloom: '+ticket.subject,text:`Hello ${ticket.name},\n\n${body}\n\nMessage reference: ${id}`,action:{label:'Contact support',url:this.origin+'/support'}});}
   return {saved:true};
  });
 }
 async retry(actor:string){return this.change(actor,'notifications.retry','outbox',async db=>{
  const r=await db.query("UPDATE notification_outbox SET next_attempt_at=now(),attempts=0 WHERE sent_at IS NULL AND (lease_until IS NULL OR lease_until<now())");return {queued:r.rowCount};
 });}
}
