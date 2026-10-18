import 'server-only';
import { services } from './services';
import { AudioError, MAX_AUDIO_BYTES, readBody, uuid } from './audio-validation';
import { boundedAuthRequest } from './bounded-request';

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
      if (file.url) return new Response(null,{status:307,headers:{...headers,Location:file.url}});
      const data=file.data!;
      const common={...headers,'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Disposition':`${download?'attachment':'inline'}; filename="djayvo-mix.wav"`};
      const range=request.headers.get('range');
      if (!range) return new Response(new Uint8Array(data),{headers:{...common,'Content-Length':String(data.length)}});
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      let start=0,end=data.length-1;
      if (match && match[1]) { start=Number(match[1]); if (match[2]) end=Math.min(end,Number(match[2])); }
      else if (match && match[2]) start=Math.max(0,data.length-Number(match[2]));
      else throw new AudioError('Invalid byte range.',416);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>end || start>=data.length) return new Response(null,{status:416,headers:{...common,'Content-Range':`bytes */${data.length}`}});
      return new Response(new Uint8Array(data.subarray(start,end+1)),{status:206,headers:{...common,'Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${data.length}`}});
    }
    throw new AudioError('Unsupported operation.',404);
  } catch(error) {
    return Response.json({error:error instanceof AudioError ? error.message : 'Account audio is unavailable. Your local mix is safe; retry shortly.'},
      {status:error instanceof AudioError ? error.status : 503,headers});
  }
}
