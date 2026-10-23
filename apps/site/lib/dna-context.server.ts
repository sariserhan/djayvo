import {accountsConfigured,services} from './services';
import {DnaCommerce,type DnaContext} from './dna-commerce';
export async function dnaContext(request:Request):Promise<DnaContext|undefined>{
 if(!accountsConfigured())return undefined;
 const {pool,auth,config}=services();
 // Never spend real credits or launch hosted compute through the local singer preview.
 if(!config.local||process.env.JAMLOOM_DNA_CREDITS_SANDBOX!=='true')return undefined;
 const session=await auth.api.getSession({headers:request.headers});
 return {commerce:new DnaCommerce(pool,config.secret),owner:session?.user.emailVerified?session.user.id:null};
}
