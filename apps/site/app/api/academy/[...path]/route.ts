import {accountsConfigured,services} from '../../../../lib/services';
import {academyLesson} from '../../../../lib/academy-content';import {academyTracks} from '../../../../lib/academy-assets';
import {AcademyStore} from '../../../../lib/academy-store';import {readBody,AudioError} from '../../../../lib/audio-validation';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
async function handle(request:Request,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params;
 try{
  const lesson=path[0]==='lesson'&&path.length===2?academyLesson(path[1]):undefined;
  if(request.method==='GET'&&lesson?.free)return Response.json({lesson,tracks:await academyTracks()},{headers});
  if(!accountsConfigured())return Response.json({error:'Sign in to save Academy progress.'},{status:401,headers});
  const {auth,pool,config}=services();if(request.method!=='GET'&&request.headers.get('origin')!==config.baseURL)return Response.json({error:'Origin denied'},{status:403,headers});
  const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return Response.json({error:'Sign in with a verified account.'},{status:401,headers});
  const store=new AcademyStore(pool),owner=session.user.id;
  if(request.method==='GET'&&lesson){await store.allowed(owner,lesson.id);return Response.json({lesson,tracks:await academyTracks()},{headers});}
  if(path.length===1&&path[0]==='progress'){
   if(request.method==='GET')return Response.json({access:await store.access(owner),attempts:await store.progress(owner)},{headers});
   if(request.method==='DELETE'){await store.removeProgress(owner);return Response.json({deleted:true},{headers});}
  }
  if(request.method==='POST'&&path.length===1){
   const data=JSON.parse((await readBody(request.body,1800000)).toString());
   if(path[0]==='attempt'&&typeof data.lessonId==='string')return Response.json({id:await store.begin(owner,data.lessonId)},{headers});
   if(path[0]==='result')return Response.json(await store.submit(owner,data,(await academyTracks()).map(t=>t.sha256)),{headers});
  }
  return Response.json({error:'Academy operation unavailable'},{status:404,headers});
 }catch(error){const message=error instanceof Error?error.message:'';
  if(error instanceof AudioError)return Response.json({error:message},{status:error.status,headers});
  if(error instanceof SyntaxError)return Response.json({error:'Invalid assessment JSON'},{status:400,headers});
  if(message==='Academy pass required'||message.includes('prerequisite'))return Response.json({error:message},{status:403,headers});
  const expected=/required|prerequisite|Unknown|Invalid|conflict|expired|Complete|attempt|silent|music|Hold|Your turn|gradual|beats|too hot|interrupted|Daily/.test(message);
  return Response.json({error:expected?message:'Academy sync is unavailable. Your local practice is unchanged.'},{status:expected?400:503,headers});
 }
}
export const GET=handle;export const POST=handle;export const DELETE=handle;
