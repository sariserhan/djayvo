import {musicDirection} from './taste-direction';
import type {TasteSuggestion} from './taste-catalogue';
export function playlistQuery(title:string){
 const noise=/^(?:(?:official\s+)?(?:(?:music|performance|lyric|lyrics)\s+)?(?:video|audio|lyrics?|visualizer|mv)|(?:music\s+)?video\s+oficial|audio\s+oficial|video\s+lyric|clip\s+officiel|resmi\s+(?:video|klip)|официальный\s+клип)(?:\s+(?:hd|4k|hq))?$/i;
 return title.replace(/\([^)]*\)|\[[^\]]*\]/g,part=>noise.test(part.slice(1,-1).trim())?'':part)
  .replace(/\s+(?:official\s+(?:(?:music|performance|lyric)\s+)?(?:video|audio|mv)|m\/v)(?:\s+@[\w]+)?\s*$/i,'').replace(/\s+/g,' ').trim();
}
const tokens=(value:string)=>playlistQuery(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/([([])with\s+/g,'$1feat ').replace(/\b(?:feat|ft|featuring)\.?\b/g,' ').match(/[\p{L}\p{N}]+/gu)?.sort().join(' ');
const same=(a:string,b:string)=>!!tokens(a)&&tokens(a)===tokens(b);
const artistName=(value:string)=>value.replace(/(?:\s*-\s*Topic|VEVO)$/i,'').trim();
export function playlistSearchQuery(title:string,artist?:string){
 const cleaned=playlistQuery(title),name=artist?artistName(artist):'';
 const query=name&&!/\s[-—–]\s/.test(cleaned)&&!cleaned.toLowerCase().includes(name.toLowerCase())?`${name} - ${cleaned}`:cleaned;
 return query.length<=160?query:cleaned;
}
const withoutGuests=(value:string)=>value.replace(/\s*[([](?:feat\.?|ft\.?|featuring|with)\s+[^)\]]+[)\]]/gi,'').replace(/\s+(?:feat\.?|ft\.?|featuring|with)\s+.+$/i,'').trim();
export function playlistLookupQueries(title:string,artist?:string){
 const primary=playlistSearchQuery(title,artist),parts=playlistQuery(title).split(/\s[-—–]\s/);
 const owner=artist?tokens(artistName(artist))?.replaceAll(' ',''):'';
 const right=parts[1]?tokens(parts[1])?.replaceAll(' ',''):'';
 const song=parts.length===2?((owner&&right?.includes(owner))||(!owner&&title.includes(' — '))?parts[0]:parts[1]):playlistQuery(title);
 const fallback=withoutGuests(song).trim();
 return [...new Set([primary,...(fallback.length>=2&&fallback.length<=160?[fallback]:[])])];
}
export function exactPlaylistMatch(title:string,choices:TasteSuggestion[]){
 const tracks=choices.filter(c=>c.kind==='Track'&&c.metadata?.source==='itunes');
 let matches=tracks.filter(c=>same(c.reference,title));
 if(!matches.length){
  const parts=playlistQuery(title).split(/\s[-—–]\s/);
  if(parts.length===2)matches=tracks.filter(c=>{
   const [song,artist,...rest]=c.reference.split(' — ');
   if(rest.length||!song||!artist)return false;
   // Guest credits can be absent in a video title. Keep title and primary artist exact,
   // and require a single full catalogue identity below (never choose among remixes).
   return [[parts[0],parts[1]],[parts[1],parts[0]]].some(([a,t])=>same(a,artist)&&!(withoutGuests(t)!==t.trim()&&withoutGuests(song)!==song.trim()&&!same(t,song))&&same(withoutGuests(t),withoutGuests(song)));
  });
 }
 // Catalogue editions with the same title, artist and genre give identical taste evidence.
 return matches.length&&matches.every(c=>same(c.reference,matches[0].reference)&&(musicDirection({references:[c.reference],referenceMetadata:[c.metadata!]})?.id??c.metadata!.genre)===(musicDirection({references:[matches[0].reference],referenceMetadata:[matches[0].metadata!]})?.id??matches[0].metadata!.genre))?matches[0]:undefined;
}
