import type {Pool,PoolClient} from 'pg';
import type {Config} from './config';
import {sendEmail,type AccountEmail} from './email';
export async function enqueueEmail(db:Pool|PoolClient,key:string,message:AccountEmail){
 await db.query('INSERT INTO notification_outbox(event_key,message) VALUES($1,$2) ON CONFLICT(event_key) DO NOTHING',[key,JSON.stringify(message)]);
}
// A leased, durable outbox keeps provider outages out of the support submission path.
export async function deliverNotifications(pool:Pool,config:Config,send=sendEmail){
 let sent=0;
 for(let i=0;i<5;i++){
  const row=(await pool.query(`UPDATE notification_outbox SET lease_until=now()+interval '2 minutes',attempts=attempts+1
   WHERE id=(SELECT id FROM notification_outbox WHERE sent_at IS NULL AND attempts<10 AND next_attempt_at<=now()
    AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
   RETURNING id,message,attempts`)).rows[0];
  if(!row)break;
  try{await send(config,row.message as AccountEmail);await pool.query('UPDATE notification_outbox SET sent_at=now(),lease_until=NULL,last_error=NULL WHERE id=$1',[row.id]);sent++;}
  catch{await pool.query("UPDATE notification_outbox SET lease_until=NULL,last_error='Delivery failed; check email configuration',next_attempt_at=now()+interval '5 minutes' WHERE id=$1",[row.id]);}
 }
 return {sent};
}
