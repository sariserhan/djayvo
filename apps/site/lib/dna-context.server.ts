import {accountsConfigured,services} from './services';
import {DnaCommerce,type DnaContext} from './dna-commerce';
import {r2AudioStore} from './audio-store';
export async function dnaContext(request:Request):Promise<DnaContext|undefined>{
 if(!accountsConfigured())return undefined;
 const {pool,auth,config}=services();
 // Hosted context supports stored-song reads; generation remains behind the local singer gate.
 const readOnly=!config.local||process.env.JAMLOOM_DNA_CREDITS_SANDBOX!=='true';
 const session=await auth.api.getSession({headers:request.headers});
 const store=!config.local||process.env.JAMLOOM_DNA_R2_ENABLED==='true'?r2AudioStore():undefined;
 return {commerce:new DnaCommerce(pool,config.secret,store,{live:process.env.CREDIT_BILLING_MODE==='live'}),owner:session?.user.emailVerified?session.user.id:null,readOnly};
}
