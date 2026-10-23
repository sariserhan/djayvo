import type {TasteSuggestion} from './taste-catalogue';
export function playlistQuery(title:string){return title.replace(/\((?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?)(?:\s+[^)]*)?\)|\[(?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?)(?:\s+[^\]]*)?\]/gi,'').trim();}
const tokens=(value:string)=>playlistQuery(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.sort().join(' ');
export function exactPlaylistMatch(title:string,choices:TasteSuggestion[]){
 const matches=choices.filter(c=>c.kind==='Track'&&c.metadata?.source==='itunes'&&tokens(c.reference)===tokens(title));
 return matches.length===1?matches[0]:undefined;
}
