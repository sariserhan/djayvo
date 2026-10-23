import {boundedAuthRequest} from '../../../lib/bounded-request';
import {PlaylistImport,PlaylistImportError} from '../../../lib/playlist-import';
export const runtime='nodejs';
const playlists=new PlaylistImport(),headers={'Cache-Control':'private, no-store'};
export function GET(){return Response.json({youtube:Boolean(process.env.YOUTUBE_API_KEY),spotify:false},{headers});}
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||!origin||new URL(origin).host!==(request.headers.get('host')??new URL(request.url).host))return Response.json({error:'Origin denied'},{status:403,headers});
  const bounded=await boundedAuthRequest(request,8192);
  if(!bounded)return Response.json({error:'Playlist link is too long.'},{status:413,headers});
  let data;try{data=await bounded.json();}catch{return Response.json({error:'Paste a playlist link.'},{status:400,headers});}
  return Response.json(await playlists.load(data?.url,data?.pageToken??null),{headers});
 }catch(error){return Response.json({error:error instanceof PlaylistImportError?error.message:'The playlist could not load. Try again shortly.'},{status:error instanceof PlaylistImportError?error.status:503,headers:{...headers,'Retry-After':'60'}});}
}
