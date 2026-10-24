import {accountsConfigured,services} from '../../../lib/services';
import {Wallet} from '../../../lib/wallet';
import {deletionRequest} from '../../../lib/account-deletion';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){
 if(!accountsConfigured())return Response.json({error:'Accounts unavailable.'},{status:503,headers});
 try{
  const {auth,pool}=services();
  const session=await auth.api.getSession({headers:request.headers});
  if(!session?.user.emailVerified)return Response.json({error:'Verified sign-in required.'},{status:401,headers});
  const balance=await new Wallet(pool).balance(session.user.id);
  return Response.json({user:{id:session.user.id,email:session.user.email},balance,purchasesReleased:false,deletionRequest:await deletionRequest(pool,session.user.id)},{headers});
 }catch{return Response.json({error:'Account balance unavailable.'},{status:503,headers});}
}
