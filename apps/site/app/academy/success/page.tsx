import {headers} from 'next/headers';import {accountsConfigured,services} from '../../../lib/services';
export const dynamic='force-dynamic';
export default async function Success({searchParams}:{searchParams:Promise<{session_id?:string}>}){
 let granted=false;const {session_id}=await searchParams;
 if(accountsConfigured()&&/^cs_[A-Za-z0-9_]+$/.test(session_id??'')){try{const {auth,pool}=services(),s=await auth.api.getSession({headers:await headers()});
  if(s?.user.emailVerified)granted=!!(await pool.query('SELECT 1 FROM academy_purchases WHERE receipt=$1 AND owner_id=$2 AND NOT refund_hold AND NOT dispute_hold',[session_id,s.user.id])).rowCount;}catch{}}
 return <section className="product-document"><h1>{granted?'Academy sandbox access verified':'Waiting for verified payment'}</h1><p>{granted?'Your signed payment notification has been recorded for this account.':'A return from Checkout does not grant access. Sign in to the purchasing account and refresh after Stripe has delivered the verified notification.'}</p><p>No generation credits were granted or deducted.</p><a href="/academy/learn">Open your learning dashboard →</a></section>;}
