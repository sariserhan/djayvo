import {createHash} from 'node:crypto';
import {accountsConfigured,services} from '../../../../../lib/services';
import {boundedAuthRequest} from '../../../../../lib/bounded-request';
import {appleVerifier,appleEnvironment,reconcileAppleNotification} from '../../../../../lib/apple-payments';
import {Wallet} from '../../../../../lib/wallet';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return Response.json({error:'Accounts unavailable'},{status:503});
 let verifier,environment;try{environment=appleEnvironment();verifier=appleVerifier();}catch{return Response.json({error:'Apple verification unavailable'},{status:503});}
 const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
 let payload:string;
 try{const body=await bounded.json();if(Object.keys(body).length!==1||typeof body.signedPayload!=='string'||!body.signedPayload.length)throw Error();payload=body.signedPayload;}
 catch{return Response.json({error:'Invalid notification'},{status:400});}
 try{
  const {pool}=services(),digest=createHash('sha256').update(payload).digest('hex');
  const notice=await reconcileAppleNotification(verifier,new Wallet(pool,environment==='Production'),payload,process.env.APPLE_BUNDLE_ID!,environment);
  if(notice.manualReview)return Response.json({error:'Refund reversal requires manual ledger reconciliation; retry delivery.'},{status:503});
  await pool.query("INSERT INTO provider_webhook_events(provider,event_id,digest) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[environment==='Production'?'apple_live':'apple_sandbox',notice.id,digest]);
  const row=(await pool.query("SELECT digest FROM provider_webhook_events WHERE provider=$1 AND event_id=$2",[environment==='Production'?'apple_live':'apple_sandbox',notice.id])).rows[0];
  if(row?.digest!==digest)throw Error('Conflicting notification');
  return Response.json({received:true,manualReview:notice.manualReview});
 }catch{return Response.json({error:'Notification could not be reconciled; retry delivery.'},{status:503});}
}
