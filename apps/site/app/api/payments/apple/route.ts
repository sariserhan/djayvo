import {accountsConfigured,services} from '../../../../lib/services';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
import {Wallet} from '../../../../lib/wallet';
import {appleVerifier,appleEnvironment,fulfillApple} from '../../../../lib/apple-payments';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!accountsConfigured())return Response.json({error:'Accounts unavailable'},{status:503});
 const {auth,pool,config}=services();
 if(request.headers.get('origin')!==config.baseURL)return Response.json({error:'Origin denied'},{status:403});
 const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
 const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return Response.json({error:'Sign in required'},{status:401});
 let verifier,environment;try{environment=appleEnvironment();verifier=appleVerifier();}catch{return Response.json({error:'Apple verification unavailable'},{status:503});}
 try{
  const body=await bounded.json(),wallet=new Wallet(pool,environment==='Production');
  if(body.action==='account-token'&&Object.keys(body).length===1)return Response.json({appAccountToken:await wallet.accountToken(session.user.id)});
  if(body.action!=='verify'||typeof body.signedTransaction!=='string'||Object.keys(body).length!==2)throw new Error('Invalid request');
  const id=await fulfillApple(verifier,wallet,session.user.id,body.signedTransaction,process.env.APPLE_BUNDLE_ID!,environment);
  return Response.json({delivered:true,lotId:id});
 }catch{return Response.json({error:'Transaction not delivered. Keep it unfinished and retry after checking the account and purchase configuration.'},{status:400});}
}
