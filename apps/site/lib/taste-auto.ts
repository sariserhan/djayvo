import {MAX_FAVORITES} from './taste-limits';
import {emptyTaste,energies,validateTaste,type Taste} from './taste';
import {tasteCatalogue,type ReferenceMetadata,type TasteSuggestion} from './taste-catalogue';

const key=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// shortcut: genre-family arrangement rules only; use licensed audio features when available for deeper taste inference.
const styles=[
 {match:/classical|orchestral|opera/,tempo:84,energy:0,instruments:['piano'],direction:1},
 {match:/ambient|chill|lo.?fi|lounge|new age/,tempo:78,energy:0,instruments:['piano','synth','bass'],direction:2},
 {match:/jazz/,tempo:100,energy:1,instruments:['piano','bass','drums'],direction:1},
 {match:/blues/,tempo:86,energy:1,instruments:['guitar','bass','drums'],direction:2},
 {match:/country|folk|acoustic|singer.songwriter/,tempo:96,energy:1,instruments:['guitar','piano','bass'],direction:1},
 {match:/reggae|dub|ska/,tempo:88,energy:1,instruments:['guitar','bass','drums'],direction:0},
 {match:/hip.?hop|rap/,tempo:92,energy:1,instruments:['synth','bass','drums'],direction:0},
 {match:/r&b|rnb|rhythm.*blues|soul/,tempo:96,energy:1,instruments:['piano','bass','drums'],direction:0},
 {match:/dance|house|techno|trance|edm|drum.*bass/,tempo:128,energy:2,instruments:['synth','bass','drums'],direction:0},
 {match:/electronic|synthwave/,tempo:112,energy:1,instruments:['synth','piano','bass','drums'],direction:2},
 {match:/rock|metal|punk|alternative|indie/,tempo:118,energy:2,instruments:['guitar','bass','drums'],direction:1},
 {match:/pop/,tempo:110,energy:1,instruments:['piano','synth','bass','drums'],direction:1},
 {match:/funk|disco/,tempo:112,energy:1,instruments:['guitar','bass','drums'],direction:0},
 {match:/latin|salsa|bachata|bossa|flamenco/,tempo:108,energy:1,instruments:['guitar','piano','bass','drums'],direction:0}
];

export function favoriteList(value:Taste):Taste{
 const p=validateTaste(value),references=[...p.references];
 for(const choice of p.catalogue??[]){
  if(choice.rating==='avoid')continue;
  const track=tasteCatalogue.find(t=>t.id===choice.id)!;const reference=`${track.title} — ${track.artist}`;
  if(references.length<MAX_FAVORITES&&!references.some(r=>key(r)===key(reference)))references.push(reference);
 }
 const metadata=[...(p.referenceMetadata??[])];
 for(const reference of references){
  if(metadata.some(m=>m.reference===reference))continue;
  const tracks=tasteCatalogue.filter(t=>key(`${t.title} — ${t.artist}`)===key(reference)||key(t.artist)===key(reference));
  const genre=[...new Set(tracks.map(t=>t.genre))].join(' / ');
  if(genre&&genre.length<=80)metadata.push({reference,genre,source:'practice'});
 }
 return {...p,references,referenceMetadata:metadata};
}

export function automaticTaste(value:Taste){
 const p=favoriteList(value),seen=new Set<string>(),genres=new Map<string,number>(),parts=new Map<string,number>(),directions=[0,0,0];
 let tempo=0,energy=0,used=0;const unresolved:string[]=[],unsupported:string[]=[];
 for(const reference of p.references){
  if(seen.has(key(reference)))continue;seen.add(key(reference));
  const metadata=p.referenceMetadata?.find(m=>m.reference===reference);
  if(!metadata){unresolved.push(reference);continue;}
  genres.set(metadata.genre,(genres.get(metadata.genre)??0)+1);
  const matches=styles.filter(style=>style.match.test(metadata.genre.toLowerCase()));
  if(!matches.length){unsupported.push(reference);continue;}
  used++;
  for(const style of matches){
   const weight=1/matches.length;tempo+=style.tempo*weight;energy+=style.energy*weight;directions[style.direction]+=weight;
   for(const instrument of style.instruments)parts.set(instrument,(parts.get(instrument)??0)+weight);
  }
 }
 const ranked=[...genres].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
 const instruments=[...parts].filter(([,score])=>score/used>=.35).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,4).map(([name])=>name);
 const profile:Taste={...p,tempo:used?Math.round(tempo/used):emptyTaste.tempo,energy:used?energies[Math.round(energy/used)]:emptyTaste.energy,
  instruments:instruments.length?instruments:[...emptyTaste.instruments],direction:used?directions.indexOf(Math.max(...directions)):0,novelty:Math.min(70,40+ranked.length*5)};
 return {profile,genres:ranked,used,total:seen.size,unresolved,unsupported,confidence:used?'genre_based' as const:'unresolved' as const,
  explanation:used?'Genre labels guide the arrangement. Tempo, energy and instruments are creative choices, not measurements of those songs.':'No usable genre information yet. This will be a general original composition.',
  unknown:['reference tempo','reference groove','reference harmony','reference melody','reference instrumentation']};
}

export async function resolveFavoriteMetadata(value:Taste,signal:AbortSignal,request:typeof fetch=fetch):Promise<Taste>{
 const p=favoriteList(value),metadata=[...(p.referenceMetadata??[])];
 for(const reference of p.references){
  signal.throwIfAborted();if(metadata.some(m=>m.reference===reference))continue;
  try{
   const response=await request('/api/music-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:reference.replace(/\s+[—–]\s+/g,' ')}),signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
   if(!response.ok)break;
   const data=await response.json();if(!Array.isArray(data.suggestions))continue;
   // Only an exact artist or title-and-artist match can label an unlisted/legacy favorite.
   const match=(data.suggestions as TasteSuggestion[]).find(s=>typeof s.reference==='string'&&key(s.reference)===key(reference)&&s.metadata);
   if(match?.metadata){
    const candidate:ReferenceMetadata={...match.metadata,reference};
    validateTaste({...p,referenceMetadata:[...metadata,candidate]});metadata.push(candidate);
   }
  }catch{signal.throwIfAborted();break;}
 }
 signal.throwIfAborted();return {...p,referenceMetadata:metadata};
}
