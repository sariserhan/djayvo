import {isAdmin} from '../../../lib/admin-access';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountsConfigured,services} from '../../../lib/services';
import {Wallet} from '../../../lib/wallet';
import {creditBilling} from '../../../lib/stripe-payments';
import {CreditBuy} from './buy';
export const dynamic='force-dynamic';
export default async function Credits(){
 if(!accountsConfigured())redirect('/account/sign-in');const {auth,pool}=services();const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
 let balance:{available:number;reserved:number}|null=null;
 let enabled=false,live=process.env.CREDIT_BILLING_MODE==='live';try{const billing=creditBilling();enabled=billing.enabled;live=billing.live;}catch{}
 try{balance=await new Wallet(pool,live).balance(session.user.id);}catch{/* New schema is not applied on production until approved. */}
 return <section className="product-document"><h1>Your credits</h1>{isAdmin(session.user)&&<p>Your owner account can make songs without spending credits.</p>}{balance?<p>Available: {balance.available} · Reserved: {balance.reserved}</p>:<p>Credit accounting is not configured on this environment yet.</p>}<CreditBuy enabled={enabled} live={live}/><a href="/account/purchases">Purchase history →</a></section>;
}
