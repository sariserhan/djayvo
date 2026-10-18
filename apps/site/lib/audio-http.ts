import 'server-only';
import { services } from './services';
import { AudioError, MAX_AUDIO_BYTES, readBody, uuid } from './audio-validation';
import { boundedAuthRequest } from './bounded-request';
import { audioResponse } from './audio-response';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function audioRequest(request:Request, id?:string, action?:string) {
  try {
    const {auth,audio,config}=services();
    if (request.method!=='GET' && request.headers.get('origin')!==config.baseURL) throw new AudioError('Request origin not allowed.',403);
    const session=await auth.api.getSession({headers:request.headers});
    if (!session?.user.emailVerified) throw new AudioError('Sign in required.',401);
    if (!audio) throw new AudioError('Account audio saving is not configured. Your local mixes are safe.',503);
    const owner=session.user.id;
    if (!id && request.method==='POST') {
      const bounded=await boundedAuthRequest(request);
      if (!bounded) throw new AudioError('Save request is too large.',413);
      let value:unknown;
      try { value=await bounded.json(); } catch { throw new AudioError('Invalid save request.'); }
      return Response.json(await audio.reserve(owner,value),{headers});
    }
    uuid(id);
    if (action==='upload' && request.method==='PUT') {
      if (!audio.store.local) throw new AudioError('Use the authorized direct upload.',404);
      await audio.localUpload(owner,id,await readBody(request.body,MAX_AUDIO_BYTES));
      return Response.json({uploaded:true},{headers});
    }
    if (action==='finalize' && request.method==='POST') return Response.json(await audio.finalize(owner,id),{headers});
    if (action==='audio' && request.method==='DELETE') return Response.json(await audio.remove(owner,id),{status:202,headers});
    if (action==='audio' && request.method==='GET') {
      const download=new URL(request.url).searchParams.get('download')==='1';
      const file=await audio.playback(owner,id,download);
      return audioResponse(request,file,download);
    }
    throw new AudioError('Unsupported operation.',404);
  } catch(error) {
    return Response.json({error:error instanceof AudioError ? error.message : 'Account audio is unavailable. Your local mix is safe; retry shortly.'},
      {status:error instanceof AudioError ? error.status : 503,headers});
  }
}
