import {isAdmin} from '../../../lib/admin-access';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountsConfigured,services} from '../../../lib/services';
import {Wallet} from '../../../lib/wallet';
export const dynamic='force-dynamic';
export default async function Credits(){
 if(!accountsConfigured())redirect('/account/sign-in');const {auth,pool}=services();const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
 let balance:{available:number;reserved:number}|null=null;
 try{balance=await new Wallet(pool).balance(session.user.id);}catch{/* New schema is not applied on production until approved. */}
 return <section className="product-document"><h1>Your credits</h1>{isAdmin(session.user)&&<p>Owner account: generation reservations are credit exempt. Compute ceilings, worker safety and product release gates still apply.</p>}{balance?<p>Available: {balance.available} · Reserved: {balance.reserved}</p>:<p>Credit accounting is not configured on this environment yet.</p>}<p>Purchases and paid generation remain closed. Credits shown in development are sandbox credits and have no cash value. No expiration is applied.</p><a href="/account/purchases">Purchase history →</a></section>;
}
