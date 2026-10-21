import 'server-only';
import { services, isReviewer } from './services';
import { AudioError, uuid } from './audio-validation';
import { boundedAuthRequest } from './bounded-request';
import { audioResponse, privateHeaders as headers } from './audio-response';

export async function catalogueRequest(request:Request,path:string[]=[],playlists=false) {
  try {
    const {auth,config,catalogue,audio,pool}=services();
    if(!catalogue||!audio)throw new AudioError('Catalogue unavailable here.',503);
    if(request.method!=='GET'&&request.headers.get('origin')!==config.baseURL)throw new AudioError('Request origin not allowed.',403);
    const [id,action]=path;if(path.length>2)throw new AudioError('Not found.',404);
    if(!playlists && request.method==='GET' && id!=='review') {
      if(!id) {
        const params=new URL(request.url).searchParams;
        if(params.size===1 && params.get('sort')==='latest') return Response.json({tracks:await catalogue.latest()},{headers});
        if([...params.keys()].some(k=>!['q','strategy','mood','after'].includes(k)))throw new AudioError('Invalid filter.');
        return Response.json(await catalogue.list(params.get('q')??'',params.get('strategy')??'',params.get('mood')??'',params.get('after')??''),{headers});
      }
      if(action==='audio')return audioResponse(request,await catalogue.playback(id));
      if(!action)return Response.json(await catalogue.track(id),{headers});
    }
    const session=await auth.api.getSession({headers:request.headers});
    if(!session?.user.emailVerified)throw new AudioError('Sign in required.',401);
    const owner=session.user.id;
    if(id==='review'||action==='review'||action==='review-audio') {
      if(!isReviewer(session.user))throw new AudioError('Reviewer access required.',403);
      if(id==='review'&&request.method==='GET')return Response.json(await catalogue.queue(),{headers});
      if(action==='review-audio'&&request.method==='GET') {
        uuid(id);
        const row=(await pool.query("SELECT t.owner_id FROM tracks t JOIN catalogue_submissions c ON c.track_id=t.id WHERE t.id=$1 AND c.state IN ('submitted','approved')",[id])).rows[0];
        if(!row)throw new AudioError('Submission not found.',404);
        return audioResponse(request,await audio.playback(row.owner_id,id));
      }
    }
    if(playlists&&request.method==='GET')return Response.json(id?await catalogue.playlist(owner,id):await catalogue.playlists(owner),{headers});
    let value:Record<string,unknown>={};
    if(request.body) {
      const bounded=await boundedAuthRequest(request);if(!bounded)throw new AudioError('Request too large.',413);
      try {value=await bounded.json();if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();}catch{throw new AudioError('Invalid request.');}
    }
    let result:unknown;
    if(playlists) {
      if(!id&&request.method==='POST')result=await catalogue.createPlaylist(owner,value.title);
      else if(id&&['POST','DELETE'].includes(request.method))result=await catalogue.changePlaylist(owner,id,action,request.method==='DELETE');
      else throw new AudioError('Unsupported operation.',404);
    } else {
      uuid(id);if(request.method!=='POST')throw new AudioError('Unsupported operation.',404);
      if(action==='submit')result=await catalogue.submit(owner,id,value);
      else if(action==='withdraw')result=await catalogue.withdraw(owner,id);
      else if(action==='review') {
        if(value.decision==='approved'&&value.confirmed!==true)throw new AudioError('Confirm listening and publication-permission review before approval.');
        result=await catalogue.review(owner,id,value.decision,value.note,value.revision);
      }
      else if(action==='report')result=await catalogue.report(owner,id,value.reason);
      else throw new AudioError('Unsupported operation.',404);
    }
    return Response.json(result,{headers});
  }catch(error){return Response.json({error:error instanceof AudioError?error.message:'Catalogue unavailable. Try again later.'},{status:error instanceof AudioError?error.status:503,headers});}
}
