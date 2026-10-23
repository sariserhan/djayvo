import type {TasteSuggestion} from './taste-catalogue';
export function playlistQuery(title:string){
 const noise=/^(?:official(?:\s+music)?\s*(?:video|audio|lyrics?)|(?:music\s+)?video\s+oficial|audio\s+oficial|(?:performance|lyric|lyrics|music)\s+video|video\s+lyric|clip\s+officiel|resmi\s+(?:video|klip)|официальный\s+клип|(?:video|audio|lyrics?))(?:\s+(?:hd|4k|hq))?$/i;
 return title.replace(/\([^)]*\)|\[[^\]]*\]/g,part=>noise.test(part.slice(1,-1).trim())?'':part).replace(/\s+/g,' ').trim();
}
const tokens=(value:string)=>playlistQuery(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\b(?:feat|ft|featuring)\.?\b/g,' ').match(/[\p{L}\p{N}]+/gu)?.sort().join(' ');
export function exactPlaylistMatch(title:string,choices:TasteSuggestion[]){
 const matches=choices.filter(c=>c.kind==='Track'&&c.metadata?.source==='itunes'&&tokens(c.reference)===tokens(title));
 // Catalogue editions with the same title, artist and genre give identical taste evidence.
 return matches.length&&matches.every(c=>tokens(c.reference)===tokens(matches[0].reference)&&c.metadata?.genre===matches[0].metadata?.genre)?matches[0]:undefined;
}
