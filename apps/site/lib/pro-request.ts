import {services,accountsConfigured} from './services';
import {proAccess} from './pro-access';
import {verifyLicense} from './pro-license';
export async function proRequest(request:Request){
 if(!accountsConfigured())return false;
 const {auth,pool}=services(),token=request.headers.get('authorization');
 if(token){const license=verifyLicense(token.replace(/^Bearer /,''));return !!license&&!license.sandbox&&await proAccess(pool,license.subject,true);}
 const session=await auth.api.getSession({headers:request.headers});return !!session?.user.emailVerified&&await proAccess(pool,session.user.id,process.env.PRO_BILLING_MODE==='live');
}
