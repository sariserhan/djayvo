import {boundedAuthRequest} from '../../../lib/bounded-request';
import {MusicSearch,MusicSearchBusy} from '../../../lib/music-search';
export const runtime='nodejs';
const search=new MusicSearch(),headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  // Next may use an internal hostname in request.url; Host is the browser-facing authority.
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&(!/^https?:$/.test(new URL(origin).protocol)||new URL(origin).host!==(request.headers.get('host')??new URL(request.url).host))))throw Error();
 }catch{return Response.json({error:'Origin denied'},{status:403,headers});}
 let query:string,tracksOnly=false;
 try{
  const bounded=await boundedAuthRequest(request);if(!bounded)return Response.json({error:'Search is too long'},{status:413,headers});
  const data=await bounded.json();
  if(!data||typeof data.query!=='string'||data.query.length>160||/[\u0000-\u001f\u007f]/.test(data.query))throw Error();
  if(data.tracksOnly!==undefined&&typeof data.tracksOnly!=='boolean')throw Error();
  query=data.query;tracksOnly=data.tracksOnly===true;
 }catch{return Response.json({error:'Enter an artist or song name (up to 160 characters).'},{status:400,headers});}
 try{return Response.json({suggestions:await search.search(query,tracksOnly)},{headers});}
 catch(error){return Response.json({error:error instanceof MusicSearchBusy?'Music search is busy. Try again in a minute, or add a name yourself.':'Online music search is unavailable. Try again, or add a name yourself.'},{status:error instanceof MusicSearchBusy?429:503,headers:{...headers,'Retry-After':'60'}});}
}
