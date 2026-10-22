import {validateChoices,inferCatalogueTaste,type ReferenceChoice,type ReferenceMetadata} from './taste-catalogue';
export const energies=['gentle','balanced','intense'] as const;
export const instruments=['piano','guitar','bass','drums','synth','voice'] as const;
export const tasteAspects={gentle:'Gentle mood',intense:'High energy',slow:'Relaxed pace (80 BPM)',fast:'Fast pace (140 BPM)',piano:'Piano',guitar:'Guitar',bass:'Bass',drums:'Drums',synth:'Synth',groove:'Rhythmic groove',melody:'Melodic phrases',space:'Bass and space'} as const;
export type TasteAspect=keyof typeof tasteAspects;
export type SongPreference={reference:string;aspects:TasteAspect[];weight:number};
export type Taste={version:1;references:string[];energy:typeof energies[number];tempo:number;instruments:string[];novelty:number;catalogue?:ReferenceChoice[];songPreferences?:SongPreference[];direction?:number;referenceMetadata?:ReferenceMetadata[]};
export const emptyTaste:Taste={version:1,references:[],energy:'balanced',tempo:110,instruments:['piano','bass','drums'],novelty:50};
export function validateTaste(value:unknown):Taste{
 if(!value||typeof value!=='object')throw new Error('Invalid preference profile');
 const p=value as Taste;
 if(p.version!==1||!Array.isArray(p.references)||p.references.length>20||p.references.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||
 !energies.includes(p.energy)||!Number.isInteger(p.tempo)||p.tempo<60||p.tempo>180||!Number.isInteger(p.novelty)||p.novelty<0||p.novelty>100||
 !Array.isArray(p.instruments)||!p.instruments.length||p.instruments.length>6||new Set(p.instruments).size!==p.instruments.length||p.instruments.some(i=>!instruments.includes(i as typeof instruments[number])))throw new Error('Invalid preference profile');
 const references=p.references.map(s=>s.trim()),seen=new Set<string>();
 if(p.direction!==undefined&&(!Number.isInteger(p.direction)||p.direction<0||p.direction>2))throw Error('Invalid preference profile');
 if(p.songPreferences!==undefined&&(!Array.isArray(p.songPreferences)||p.songPreferences.length>20))throw Error('Invalid preference profile');
 const songPreferences=p.songPreferences?.map(choice=>{
  if(!choice||typeof choice.reference!=='string'||!references.includes(choice.reference)||seen.has(choice.reference)||
    !Array.isArray(choice.aspects)||choice.aspects.length>12||new Set(choice.aspects).size!==choice.aspects.length||
    choice.aspects.some(a=>typeof a!=='string'||!Object.hasOwn(tasteAspects,a))||!Number.isInteger(choice.weight)||choice.weight<1||choice.weight>5)throw Error('Invalid preference profile');
  seen.add(choice.reference);return {reference:choice.reference,aspects:[...choice.aspects],weight:choice.weight};
 });
 if(p.referenceMetadata!==undefined&&(!Array.isArray(p.referenceMetadata)||p.referenceMetadata.length>20))throw Error('Invalid preference profile');
 const metadataSeen=new Set<string>();
 const referenceMetadata=p.referenceMetadata?.map(m=>{
  if(!m||!references.includes(m.reference)||metadataSeen.has(m.reference)||typeof m.genre!=='string'||!m.genre.trim()||m.genre.length>80||/[\u0000-\u001f\u007f]/.test(m.genre)||!['itunes','practice'].includes(m.source)||
   (m.id!==undefined&&(!Number.isSafeInteger(m.id)||m.id<=0)))throw Error('Invalid preference profile');
  metadataSeen.add(m.reference);return {reference:m.reference,genre:m.genre.trim(),source:m.source,...(m.id!==undefined?{id:m.id}:{})};
 });
 return {version:1,references,energy:p.energy,tempo:p.tempo,instruments:[...p.instruments],novelty:p.novelty,...(p.catalogue?{catalogue:validateChoices(p.catalogue)}:{}),...(songPreferences?{songPreferences}:{}),...(p.direction!==undefined?{direction:p.direction}:{}),...(referenceMetadata?{referenceMetadata}:{})};
}
export function tasteBrief(profile:Taste){const p=validateTaste(profile);return {
 schema_version:'1.0-taste-brief',origin:'explicit_user_preferences',tempo_bpm:p.tempo,energy:p.energy,instruments:p.instruments,
 novelty:p.novelty,reference_count:p.references.length,
 unknown:['reference tempo','reference harmony','reference melody','reference audio features'],
 proposals:[{form:['sparse motif','interlocking groove','contrast','varied return','resolution'],focus:'rhythmic conversation'},
 {form:['pickup','melodic answer','development','quiet ending'],focus:'melodic development'},
 {form:['bass idea','space','layered response','breakdown','final variation'],focus:'bass and silence'}],
 song_preferences:p.songPreferences??[],direction:p.direction??0,catalogue:inferCatalogueTaste(p.catalogue??[]),audio_generated:false,training_opt_in:false};}

export function tasteRender(profile:Taste,seed:number,seconds:number,direction:number){
 const p=validateTaste(profile);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(seconds)||seconds<30||seconds>180||!Number.isInteger(direction)||direction<0||direction>2)throw new Error('Invalid composition request');
 const mask=['piano','guitar','bass','drums','synth'].reduce((n,name,i)=>n|(p.instruments.includes(name)?1<<i:0),0);
 if(!mask)throw new Error('Choose at least one instrument. Voice requires a consented recording in AI Improvisation.');
 return {seed,tempo:p.tempo,energy:energies.indexOf(p.energy),instruments:mask,novelty:p.novelty,seconds,direction};
}

// These are user-confirmed choices, not attributes inferred from a title or recording.
export function applySongPreferences(profile:Taste):Taste{
 const p=validateTaste(profile),scores=new Map<TasteAspect,number>();
 for(const choice of p.songPreferences??[])for(const aspect of choice.aspects)scores.set(aspect,(scores.get(aspect)??0)+choice.weight);
 const score=(aspect:TasteAspect)=>scores.get(aspect)??0;
 const weighted=(low:TasteAspect,high:TasteAspect,min:number,max:number,fallback:number)=>{
  const total=score(low)+score(high);return total?Math.round((score(low)*min+score(high)*max)/total):fallback;
 };
 const selectedInstruments=instruments.filter(i=>i!=='voice'&&score(i as TasteAspect)>0);
 const directions=['groove','melody','space'] as const,highest=Math.max(...directions.map(score));
 const winners=directions.map((a,i)=>score(a)===highest?i:-1).filter(i=>i>=0);
 return {...p,energy:energies[weighted('gentle','intense',0,2,energies.indexOf(p.energy))],
  tempo:weighted('slow','fast',80,140,p.tempo),instruments:selectedInstruments.length?selectedInstruments:p.instruments,
  direction:highest&&winners.length===1?winners[0]:p.direction??0};
}
