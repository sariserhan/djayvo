import manifest from '../../web/practice-audio/manifest.json';
export const tasteCatalogue=manifest.tracks.map(track=>({id:track.id,title:track.title,artist:track.artist,edition:'Jamloom practice master',genre:track.genre,seconds:track.seconds,license:track.license,source:track.source_page,sha256:track.sha256}));
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
