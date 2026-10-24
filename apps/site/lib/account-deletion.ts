import type {Pool} from 'pg';
import {AudioError} from './audio-validation';
import {enqueueEmail} from './notifications';
import {OWNER_EMAIL} from './admin-access';

const subject='Account deletion request';
export async function deletionRequest(pool:Pool,owner:string){
 return (await pool.query('SELECT id,status,created_at FROM support_tickets WHERE owner_id=$1 AND subject=$2 ORDER BY created_at DESC LIMIT 1',[owner,subject])).rows[0]??null;
}
export async function requestDeletion(pool:Pool,origin:string,owner:string,createdAt:Date,confirmation:unknown){
 if(confirmation!==true)throw new AudioError('Confirm that you want to request account deletion.');
 const age=Date.now()-new Date(createdAt).getTime();
 if(!Number.isFinite(age)||age<0||age>5*60_000)throw new AudioError('Sign out and sign in again before requesting account deletion.',403);
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const user=(await db.query('SELECT name,email FROM "user" WHERE id=$1 AND "emailVerified"=true AND suspended=false FOR UPDATE',[owner])).rows[0];
  if(!user)throw new AudioError('Verified sign-in required.',401);
  const existing=(await db.query("SELECT id,status,created_at FROM support_tickets WHERE owner_id=$1 AND subject=$2 AND status='open' ORDER BY created_at DESC LIMIT 1",[owner,subject])).rows[0];
  if(existing){await db.query('COMMIT');return existing;}
  const row=(await db.query(`INSERT INTO support_tickets(kind,owner_id,name,email,subject,body) VALUES('support',$1,$2,$3,$4,$5) RETURNING id,status,created_at`,[owner,user.name,user.email,subject,'Verified account holder requested deletion in Jamloom after a recent sign-in. Remove the account and associated personal data; retain only records required for financial, fraud or legal obligations. Confirm scope and completion with the account holder. This ticket is a request, not evidence of completed deletion.'])).rows[0];
  await enqueueEmail(db,'ticket:'+row.id,{to:OWNER_EMAIL,subject:'Jamloom account deletion request',text:`A verified account holder requested account deletion. Request: ${row.id}. Review associated storage, active jobs and financial retention before completing deletion.`,action:{label:'Review deletion request',url:origin+'/admin/inbox/'+row.id}});
  await db.query('COMMIT');return row;
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
