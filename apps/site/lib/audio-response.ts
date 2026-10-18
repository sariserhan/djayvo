import { AudioError } from './audio-validation';
export const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function audioResponse(request:Request,file:{data?:Buffer;url?:string},download=false) {
  if(file.url)return new Response(null,{status:307,headers:{...privateHeaders,Location:file.url}});
  const data=file.data!;
  const common={...privateHeaders,'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Disposition':`${download?'attachment':'inline'}; filename="djayvo-mix.wav"`};
  const range=request.headers.get('range');
  if(!range)return new Response(new Uint8Array(data),{headers:{...common,'Content-Length':String(data.length)}});
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  let start=0,end=data.length-1;
  if(match&&match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
  else if(match&&match[2])start=Math.max(0,data.length-Number(match[2]));
  else throw new AudioError('Invalid byte range.',416);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=data.length)return new Response(null,{status:416,headers:{...common,'Content-Range':`bytes */${data.length}`}});
  return new Response(new Uint8Array(data.subarray(start,end+1)),{status:206,headers:{...common,'Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${data.length}`}});
}
