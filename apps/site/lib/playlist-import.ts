export type PlaylistItem={title:string;url:string;artist?:string};
export class PlaylistImportError extends Error{constructor(message:string,readonly status=400){super(message);}}

export function youtubePlaylist(value:unknown){
 if(typeof value!=='string'||value.length>2048)throw new PlaylistImportError('Paste a YouTube playlist link.');
 let url:URL;try{url=new URL(value);}catch{throw new PlaylistImportError('Paste a YouTube playlist link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['youtube.com','www.youtube.com','music.youtube.com','m.youtube.com'].includes(url.hostname)||!['/playlist','/watch'].includes(url.pathname))throw new PlaylistImportError('Use a playlist link from YouTube.');
 const id=url.searchParams.get('list');
 if(!id||!/^[A-Za-z0-9_-]{10,100}$/.test(id))throw new PlaylistImportError('This link does not contain a playlist.');
 return id;
}

export function youtubeItems(value:unknown):{items:PlaylistItem[];more:boolean;next:string|null;skipped:number}{
 if(!value||typeof value!=='object'||!('items' in value)||(!Array.isArray(value.items)||value.items.length>50))throw new PlaylistImportError('YouTube returned an unreadable playlist.',502);
 const items:PlaylistItem[]=[],seen=new Set<string>();
 for(const row of value.items.slice(0,50)){
  const snippet=row?.snippet,id=snippet?.resourceId?.videoId,title=snippet?.title;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(id)||seen.has(id)||typeof title!=='string'||!title.trim()||title.length>160||/[\u0000-\u001f\u007f]/.test(title)||['Private video','Deleted video'].includes(title))continue;
  const owner=snippet?.videoOwnerChannelTitle;
  const artist=typeof owner==='string'?owner.replace(/\s*-\s*Topic$/i,'').trim():'';
  seen.add(id);items.push({title:title.trim(),url:`https://www.youtube.com/watch?v=${id}`,...(artist&&artist.length<=160&&!/[\u0000-\u001f\u007f]/.test(artist)?{artist}:{})});
 }
 const token='nextPageToken' in value?value.nextPageToken:null;
 if(token!==null&&(typeof token!=='string'||!token.length||token.length>2048||/[\u0000-\u0020\u007f]/.test(token)))throw new PlaylistImportError('YouTube returned an unreadable next page.',502);
 return {items,more:!!token,next:token as string|null,skipped:value.items.length-items.length};
}

export class PlaylistImport{
 private calls:number[]=[];
 constructor(private key:()=>string|undefined=()=>process.env.YOUTUBE_API_KEY,private request:typeof fetch=fetch,private now=Date.now){}
 async load(link:unknown,pageToken:unknown=null){
  if(pageToken!==null&&(typeof pageToken!=='string'||!pageToken.length||pageToken.length>2048||/[\u0000-\u0020\u007f]/.test(pageToken)))throw new PlaylistImportError('Invalid playlist page.');
  const id=youtubePlaylist(link),key=this.key();
  if(!key)throw new PlaylistImportError('YouTube playlist connection is not available here yet. You can still search for songs below.',503);
  // shortcut: per-process quota guard; use a shared budget before scaling instances.
  this.calls=this.calls.filter(t=>t>this.now()-60_000);
  if(this.calls.length>=10)throw new PlaylistImportError('Please wait a minute before loading another playlist.',429);
  this.calls.push(this.now());
  const params=new URLSearchParams({part:'snippet',playlistId:id,maxResults:'50',fields:'items(snippet(title,resourceId/videoId,videoOwnerChannelTitle)),nextPageToken',key});
  if(typeof pageToken==='string')params.set('pageToken',pageToken);
  let response:Response;
  try{response=await this.request(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`,{signal:AbortSignal.timeout(8000),cache:'no-store',redirect:'error'});}catch{throw new PlaylistImportError('YouTube could not be reached. Try again shortly.',503);}
  if(response.status===404)throw new PlaylistImportError('This playlist is private or unavailable. Use a public or unlisted playlist.',404);
  if(!response.ok)throw new PlaylistImportError('YouTube could not load this playlist. Try again later.',503);
  const body=await response.text();if(body.length>128_000)throw new PlaylistImportError('Playlist response is too large.',502);
  try{return {...youtubeItems(JSON.parse(body)),url:`https://www.youtube.com/playlist?list=${id}`};}catch(error){if(error instanceof PlaylistImportError)throw error;throw new PlaylistImportError('YouTube returned an unreadable playlist.',502);}
 }
}
