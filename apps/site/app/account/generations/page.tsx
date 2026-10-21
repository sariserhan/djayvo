import {headers} from 'next/headers';import {redirect} from 'next/navigation';import {accountsConfigured,services} from '../../../lib/services';
export const dynamic='force-dynamic';
export default async function Generations(){if(!accountsConfigured())redirect('/account/sign-in');const {auth,pool}=services();const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');
 let rows:{id:string;status:string;created_at:Date}[]|null=null;try{rows=(await pool.query('SELECT id,status,created_at FROM generation_reservations WHERE owner_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50',[session.user.id])).rows;}catch{}
 return <section className="product-document"><h1>Cloud generation history</h1><p>Local browser remixes stay in the studio’s local library. They are not automatically uploaded here.</p>{rows===null?<p>Cloud job accounting is not configured yet.</p>:rows.length?<ul>{rows.map(r=><li key={r.id}>Sandbox reservation {r.id} · {r.status}</li>)}</ul>:<p>No cloud jobs. Paid generation is not released.</p>}<a href="/studio/index.html">Open local remix →</a></section>;
}
