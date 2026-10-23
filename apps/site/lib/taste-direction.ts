import policy from '../../../assets/manifests/dna-directions.json';
import type {ReferenceMetadata} from './taste-catalogue';

export type FavoriteSnapshot={vocalLanguage?:string;references:string[];referenceMetadata:ReferenceMetadata[]};
const normalized=(s:string)=>s.normalize('NFKC').trim().toLowerCase();
export function favoriteKey(snapshot:FavoriteSnapshot){
 return JSON.stringify([snapshot.vocalLanguage??'auto',[...new Map(snapshot.references.map(reference=>[normalized(reference),{
  reference:normalized(reference),genre:normalized(snapshot.referenceMetadata.find(m=>normalized(m.reference)===normalized(reference))?.genre??'')
 }])).values()].sort((a,b)=>a.reference<b.reference?-1:a.reference>b.reference?1:0)]);
}
export function musicDirection(snapshot:FavoriteSnapshot){
 const votes=new Map<string,number>(),seen=new Set<string>();
 for(const reference of snapshot.references){
  if(seen.has(normalized(reference)))continue;seen.add(normalized(reference));
  const genre=snapshot.referenceMetadata.find(m=>normalized(m.reference)===normalized(reference))?.genre??'';
  const match=policy.directions.find(d=>new RegExp(d.match,'i').test(genre));
  if(match)votes.set(match.id,(votes.get(match.id)??0)+1);
 }
 const ranked=[...votes].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1));
 if(!ranked.length)return null;
 const primary=policy.directions.find(d=>d.id===ranked[0][0])!;
 return {version:policy.version,...primary,coverage:[...votes.values()].reduce((a,b)=>a+b,0),total:seen.size,
  families:ranked.map(([id,count])=>({id,label:policy.directions.find(d=>d.id===id)!.label,count}))};
}
