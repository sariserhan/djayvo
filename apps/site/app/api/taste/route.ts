import {services,accountsConfigured} from '../../../lib/services';import {boundedAuthRequest} from '../../../lib/bounded-request';import {TasteStore} from '../../../lib/taste-store';
export const runtime='nodejs';const headers={'Cache-Control':'private, no-store'};
async function handle(request:Request){
 if(!accountsConfigured())return Response.json({error:'Accounts unavailable'},{status:503,headers});
 try{
  const {auth,pool,config}=services();if(request.method!=='GET'&&request.headers.get('origin')!==config.baseURL)return Response.json({error:'Origin denied'},{status:403,headers});
  const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return Response.json({error:'Sign in to save preferences to your account.'},{status:401,headers});
  const store=new TasteStore(pool);
  if(request.method==='GET')return Response.json({saved:await store.load(session.user.id)},{headers});
  const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413,headers});
  let data;try{data=await bounded.json();if(!data||typeof data!=='object'||!Number.isInteger(data.revision)||data.revision<0||data.revision>2147483646||Object.keys(data).some(k=>!['profile','revision'].includes(k)))throw new Error();}catch{return Response.json({error:'Invalid profile request'},{status:400,headers});}
  try{if(request.method==='DELETE'){await store.remove(session.user.id,data.revision);return Response.json({deleted:true},{headers});}
   return Response.json({revision:await store.save(session.user.id,data.profile,data.revision)},{headers});
  }catch(error){if(error instanceof Error&&/Profile changed/.test(error.message))return Response.json({error:error.message},{status:409,headers});throw error;}
 }catch(error){const invalid=error instanceof Error&&/Invalid preference profile|Invalid bounded integer/.test(error.message);return Response.json({error:invalid?'Invalid preference profile.':'Account preferences are unavailable. Your local copy is unchanged.'},{status:invalid?400:503,headers});}
}
export const GET=handle;export const POST=handle;export const DELETE=handle;
