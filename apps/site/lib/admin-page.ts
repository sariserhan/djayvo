import 'server-only';
import {headers} from 'next/headers';
import {redirect,notFound} from 'next/navigation';
import {services,accountsConfigured} from './services';
import {isAdmin,adminAccount} from './admin-access';
export async function requireAdmin(){
 if(!accountsConfigured())notFound();const svc=services(),session=await svc.auth.api.getSession({headers:await headers()});
 if(!session?.user.emailVerified)redirect('/account/sign-in');
 if(!isAdmin(session.user)||!await adminAccount(svc.pool,session.user.id))notFound();
 return {...svc,user:session.user};
}
export function pageNumber(value?:string){const n=Number(value??1);return Number.isSafeInteger(n)&&n>0&&n<=10000?n:1;}
