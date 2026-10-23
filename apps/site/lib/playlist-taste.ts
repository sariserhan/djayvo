import type {PlaylistItem} from './playlist-import';
import type {TasteSuggestion} from './taste-catalogue';
import {exactPlaylistMatch,playlistQuery,playlistSearchQuery,playlistLookupQueries} from './playlist-match';
import {MAX_FAVORITES} from './taste-limits';
export type PlaylistProgress={phase:'reading'|'matching'|'waiting';read:number;checked:number;matched:number};
const wait=(ms:number,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
 signal.throwIfAborted();const abort=()=>{clearTimeout(timer);reject(signal.reason);};
 const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});
});
export async function playlistTaste(url:string,signal:AbortSignal,progress:(value:PlaylistProgress)=>void,request:typeof fetch=fetch,pause=wait){
 const items=new Map<string,PlaylistItem>(),matches=new Map<string,TasteSuggestion>(),unmatched:PlaylistItem[]=[];
 let checked=0,skipped=0;const update=(phase:PlaylistProgress['phase'])=>progress({phase,read:items.size,checked,matched:matches.size});
 async function post(path:string,body:unknown){
  for(let attempt=0;attempt<4;attempt++){
   signal.throwIfAborted();const response=await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
   if(response.status===429&&attempt<3){update('waiting');const seconds=Number(response.headers.get('Retry-After')??60);await pause(Math.min(120,Math.max(1,Number.isFinite(seconds)?seconds:60))*1000,signal);continue;}
   const data=await response.json();if(!response.ok)throw Error(data.error??'The playlist could not be checked. Try again.');return data;
  }
 }
 let token:string|null=null;const pages=new Set<string>();
 do{
  update('reading');const data=await post('/api/playlist-import',{url,pageToken:token});
  if(!Array.isArray(data.items)||data.items.length>50||!(data.next===null||typeof data.next==='string'))throw Error('The playlist returned an unreadable page.');
  skipped+=Number.isSafeInteger(data.skipped)&&data.skipped>=0?data.skipped:0;
  for(const item of data.items){
   if(!item||typeof item.title!=='string'||!item.title.trim()||item.title.length>160||typeof item.url!=='string'||!/^https:\/\/www.youtube.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(item.url))throw Error('The playlist returned an unreadable song.');
   if(items.has(item.url)){skipped++;continue;}items.set(item.url,item);
  }
  if(items.size>MAX_FAVORITES)throw Error(`Playlists can contain up to ${MAX_FAVORITES.toLocaleString()} available songs. Your favorites have not changed.`);
  token=data.next;if(token){if(pages.has(token)||pages.size>=100)throw Error('The playlist could not be read completely. Your favorites have not changed.');pages.add(token);}
 }while(token);
 // Respect the catalogue's provider budget; a busy response waits and retries instead of losing later songs.
 for(const item of items.values()){
  signal.throwIfAborted();update('matching');
  const title=playlistQuery(item.title),query=playlistSearchQuery(item.title,item.artist);
  let match:TasteSuggestion|undefined;
  for(const search of playlistLookupQueries(item.title,item.artist)){
   const data=await post('/api/music-search',{query:search,tracksOnly:true});
   if(!Array.isArray(data.suggestions))throw Error('Song matching is temporarily unavailable. Your favorites have not changed.');
   match=exactPlaylistMatch(title,data.suggestions)??exactPlaylistMatch(query,data.suggestions);
   if(match)break;
  }
  if(match){const key=match.reference.normalize('NFKC').toLowerCase();if(matches.has(key))skipped++;else matches.set(key,match);}else unmatched.push(item);
  checked++;update('matching');
 }
 signal.throwIfAborted();return {songs:[...matches.values()],unmatched,read:items.size,skipped};
}
