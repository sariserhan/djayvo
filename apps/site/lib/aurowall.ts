import {S3Client,ListObjectsV2Command,GetObjectCommand,type _Object} from '@aws-sdk/client-s3';
import {createHash} from 'node:crypto';
export type AurowallTrack={id:string;title:string;artist:string;genre:string;bytes:number;url:string};
type StoredTrack=AurowallTrack&{key:string;etag?:string};
const MAX_BYTES=100*1024*1024;
export function aurowallObject(object:_Object):StoredTrack|null{
 const match=object.Key?.match(/^([a-z0-9-]+)\/([a-zA-Z0-9 _-]+)\.mp3$/);
 if(!match||!Number.isSafeInteger(object.Size)||object.Size!<=0||object.Size!>MAX_BYTES)return null;
 const title=(s:string)=>s.replace(/[-_]/g,' ').replace(/\b[a-z]/g,c=>c.toUpperCase());
 const id=createHash('sha256').update(object.Key!).digest('hex').slice(0,24);
 return {id,title:title(match[2]),artist:'Aurowall',genre:title(match[1]),bytes:object.Size!,url:'/api/aurowall/'+id,key:object.Key!,etag:object.ETag};
}
export function audioRange(value:string|null,size:number){
 if(value===null)return undefined;
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);if(!match||(!match[1]&&!match[2]))throw Error('Invalid range');
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw Error('Invalid range');
 return `bytes=${start}-${end}`;
}
function storage(){const e=process.env,account=e.R2_AUROWALL_ACCOUNT_ID,bucket=e.R2_AUROWALL_BUCKET,access=e.R2_AUROWALL_ACCESS_KEY_ID,secret=e.R2_AUROWALL_SECRET_ACCESS_KEY;
 if(!account||!/^[a-f0-9]{32}$/.test(account)||!bucket||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)||!access||!secret)throw Error('Aurowall music is not configured');
 return {bucket,client:new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId:access,secretAccessKey:secret},maxAttempts:2})};
}
let cache:{until:number;tracks:StoredTrack[]}|undefined,inFlight:Promise<StoredTrack[]>|undefined;
export async function aurowallTracks():Promise<StoredTrack[]>{
 if(cache&&Date.now()<cache.until)return cache.tracks;
 if(inFlight)return inFlight;
 inFlight=(async()=>{const {client,bucket}=storage();const tracks:StoredTrack[]=[];let token:string|undefined;
  try{for(let page=0;page<4;page++){const result=await client.send(new ListObjectsV2Command({Bucket:bucket,MaxKeys:1000,ContinuationToken:token}),{abortSignal:AbortSignal.timeout(10000)});
   for(const object of result.Contents??[]){const track=aurowallObject(object);if(track)tracks.push(track);}
   if(!result.IsTruncated){tracks.sort((a,b)=>a.genre.localeCompare(b.genre)||a.title.localeCompare(b.title));cache={until:Date.now()+300000,tracks};return tracks;}
   token=result.NextContinuationToken;if(!token)throw Error('Incomplete music catalogue');
  }throw Error('Music catalogue exceeds listing limit');}finally{client.destroy();}
 })();try{return await inFlight;}finally{inFlight=undefined;}
}
export async function aurowallAudio(request:Request,id:string){
 const track=(await aurowallTracks()).find(t=>t.id===id);if(!track)return new Response(null,{status:404});
 let range:string|undefined;try{range=audioRange(request.headers.get('range'),track.bytes);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${track.bytes}`}});}
 const {client,bucket}=storage();
 try{const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:track.key,Range:range,IfMatch:track.etag}),{abortSignal:AbortSignal.any([request.signal,AbortSignal.timeout(120000)])});
  if(!object.Body)throw Error('Missing audio');
  const headers:Record<string,string>={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if(object.ContentLength!==undefined)headers['Content-Length']=String(object.ContentLength);if(object.ContentRange)headers['Content-Range']=object.ContentRange;
  // Stream without buffering the song; abort/cancel closes the underlying SDK response.
  const reader=object.Body.transformToWebStream().getReader();
  const body=new ReadableStream<Uint8Array>({async pull(controller){try{const next=await reader.read();if(next.done){client.destroy();controller.close();}else controller.enqueue(next.value);}catch(error){client.destroy();controller.error(error);}},async cancel(){try{await reader.cancel();}finally{client.destroy();}}});
  return new Response(body,{status:range?206:200,headers});
 }catch(error){client.destroy();throw error;}
}
