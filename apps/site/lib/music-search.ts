import type {TasteSuggestion} from './taste-catalogue';

export function musicSearchResults(value:unknown):TasteSuggestion[]{
 if(!value||typeof value!=='object'||!('results' in value)||!Array.isArray(value.results))throw Error('Invalid music search response');
 const artists:TasteSuggestion[]=[],tracks:TasteSuggestion[]=[],seen=new Set<string>();
 for(const row of value.results.slice(0,100)){
  if(!row||typeof row!=='object'||typeof row.artistName!=='string')continue;
  const artist=row.artistName.trim();
  const kind=row.wrapperType==='artist'?'Artist':row.wrapperType==='track'&&row.kind==='song'?'Track':null;
  if(!kind||!artist||(kind==='Track'&&(typeof row.trackName!=='string'||!row.trackName.trim())))continue;
  const reference=kind==='Artist'?artist:`${row.trackName.trim()} — ${artist}`,key=reference.normalize('NFKC').toLowerCase();
  if(reference.length>160||/[\u0000-\u001f\u007f]/.test(reference)||seen.has(key))continue;
  seen.add(key);
  (kind==='Artist'?artists:tracks).push({reference,kind,detail:typeof row.collectionName==='string'?`${row.collectionName.slice(0,100)} · iTunes`:'iTunes catalogue'});
 }
 return [...artists.slice(0,4),...tracks.slice(0,8)];
}

export class MusicSearchBusy extends Error {}
export class MusicSearch {
 private cache=new Map<string,{expires:number;results:TasteSuggestion[]}>();
 private pending=new Map<string,Promise<TasteSuggestion[]>>();
 private calls:number[]=[];
 constructor(private request:typeof fetch=fetch,private now=Date.now){}
 async search(query:string):Promise<TasteSuggestion[]>{
  if(query.length>160||/[\u0000-\u001f\u007f]/.test(query))throw Error('Invalid search');
  const q=query.trim().normalize('NFC').toLowerCase(),now=this.now();
  if(q.length<2)return [];
  for(const [key,value] of this.cache)if(value.expires<=now)this.cache.delete(key);
  const cached=this.cache.get(q);if(cached)return cached.results;
  const pending=this.pending.get(q);if(pending)return pending;
  // shortcut: cache and provider budget are per process; use a shared budget before scaling to multiple instances.
  this.calls=this.calls.filter(time=>time>now-60_000);
  if(this.calls.length>=20)throw new MusicSearchBusy();
  this.calls.push(now);
  const work=this.load(q);this.pending.set(q,work);
  try{
   const results=await work;
   if(this.cache.size>=200)this.cache.delete(this.cache.keys().next().value!);
   this.cache.set(q,{expires:this.now()+3_600_000,results});return results;
  }finally{this.pending.delete(q);}
 }
 private async load(query:string){
  const params=new URLSearchParams({term:query,media:'music',entity:'musicArtist,song',country:'US',limit:'20'});
  const response=await this.request(`https://itunes.apple.com/search?${params}`,{signal:AbortSignal.timeout(5000),cache:'no-store',redirect:'error'});
  if(response.status===429)throw new MusicSearchBusy();
  if(!response.ok)throw Error('Music search unavailable');
  return musicSearchResults(await response.json());
 }
}
