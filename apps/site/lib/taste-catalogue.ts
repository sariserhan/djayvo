import manifest from '../../web/practice-audio/manifest.json';
export const tasteCatalogue=manifest.tracks.map(track=>({id:track.id,title:track.title,artist:track.artist,edition:'Jamloom practice master',genre:track.genre,audio:'/studio/'+track.url.replace(/^\.\//,''),seconds:track.seconds,license:track.license,source:track.source_page,sha256:track.sha256}));
export type ReferenceChoice={id:string;rating:'love'|'like'|'avoid';weight:number};
export function validateChoices(value:unknown):ReferenceChoice[]{
 if(!Array.isArray(value)||value.length>20)throw Error('Invalid catalogue choices');
 const ids=new Set<string>();return value.map(v=>{
  if(!v||!tasteCatalogue.some(t=>t.id===v.id)||ids.has(v.id)||!['love','like','avoid'].includes(v.rating)||!Number.isInteger(v.weight)||v.weight<1||v.weight>5)throw Error('Invalid catalogue choice');
  ids.add(v.id);return {id:v.id,rating:v.rating,weight:v.weight};
 });
}
export function inferCatalogueTaste(value:ReferenceChoice[]){
 const choices=validateChoices(value),genres=new Map<string,number>();
 const evidence=choices.map(choice=>{
  const track=tasteCatalogue.find(t=>t.id===choice.id)!;
  const influence=(choice.rating==='love'?2:choice.rating==='like'?1:-1)*choice.weight;
  genres.set(track.genre,(genres.get(track.genre)??0)+influence);
  return {...track,rating:choice.rating,weight:choice.weight,influence};
 });
 return {origin:'cleared_catalogue_metadata' as const,genres:[...genres].map(([genre,score])=>({genre,score})).sort((a,b)=>b.score-a.score),evidence,
  confidence:choices.length?'limited_metadata':'none',unknown:['tempo','key','melody','instrumentation','vocal language','energy'],
  explanation:'Genre scores use the catalogue labels and your ratings, not analysis of a recording. Your tempo, energy and instrument controls remain authoritative.'};
}

export type TasteSuggestion={reference:string;kind:'Track'|'Artist'|'Saved favorite';detail:string};
const normalize=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function distance(a:string,b:string){
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){
  const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));
  row=next;
 }return row[b.length];
}
export function searchTasteReferences(query:string,saved:string[]=[]):TasteSuggestion[]{
 // Local matches remain available when online catalogue search is unavailable.
 const q=normalize(query.slice(0,160));
 const candidates:TasteSuggestion[]=[
  ...tasteCatalogue.map(t=>({reference:`${t.title} — ${t.artist}`,kind:'Track' as const,detail:t.edition})),
  ...[...new Set(tasteCatalogue.map(t=>t.artist))].map(artist=>({reference:artist,kind:'Artist' as const,detail:'In the practice catalogue'})),
  ...saved.slice(0,20).map(reference=>({reference,kind:'Saved favorite' as const,detail:'From your saved choices'}))
 ];
 const seen=new Set<string>();
 return candidates.filter(c=>{const key=normalize(c.reference);if(seen.has(key))return false;seen.add(key);return true;})
  .map(candidate=>{
   const name=normalize(candidate.reference),words=name.split(' ');
   let score=0;
   if(q){
    if(name===q)score=100;
    else if(name.startsWith(q))score=90;
    else if(name.includes(q))score=80;
    else{
     const costs=q.split(' ').map(term=>Math.min(...words.map(word=>word.startsWith(term)?0:distance(term,word))));
     score=costs.every((cost,i)=>cost<=(q.split(' ')[i].length>=4?1:0))?60-costs.reduce((a,b)=>a+b,0):0;
    }
   }
   return {candidate,score};
  }).filter(r=>!q||r.score>0).sort((a,b)=>b.score-a.score||a.candidate.reference.localeCompare(b.candidate.reference)).slice(0,8).map(r=>r.candidate);
}
