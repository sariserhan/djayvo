import {validateChoices,inferCatalogueTaste,type ReferenceChoice} from './taste-catalogue';
export const energies=['gentle','balanced','intense'] as const;
export const instruments=['piano','guitar','bass','drums','synth','voice'] as const;
export type Taste={version:1;references:string[];energy:typeof energies[number];tempo:number;instruments:string[];novelty:number;catalogue?:ReferenceChoice[]};
export const emptyTaste:Taste={version:1,references:[],energy:'balanced',tempo:110,instruments:['piano','bass','drums'],novelty:50};
export function validateTaste(value:unknown):Taste{
 if(!value||typeof value!=='object')throw new Error('Invalid preference profile');
 const p=value as Taste;
 if(p.version!==1||!Array.isArray(p.references)||p.references.length>20||p.references.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||
 !energies.includes(p.energy)||!Number.isInteger(p.tempo)||p.tempo<60||p.tempo>180||!Number.isInteger(p.novelty)||p.novelty<0||p.novelty>100||
 !Array.isArray(p.instruments)||!p.instruments.length||p.instruments.length>6||new Set(p.instruments).size!==p.instruments.length||p.instruments.some(i=>!instruments.includes(i as typeof instruments[number])))throw new Error('Invalid preference profile');
 return {version:1,references:p.references.map(s=>s.trim()),energy:p.energy,tempo:p.tempo,instruments:[...p.instruments],novelty:p.novelty,...(p.catalogue?{catalogue:validateChoices(p.catalogue)}:{})};
}
export function tasteBrief(profile:Taste){const p=validateTaste(profile);return {
 schema_version:'1.0-taste-brief',origin:'explicit_user_preferences',tempo_bpm:p.tempo,energy:p.energy,instruments:p.instruments,
 novelty:p.novelty,reference_count:p.references.length,
 unknown:['reference tempo','reference harmony','reference melody','reference audio features'],
 proposals:[{form:['sparse motif','interlocking groove','contrast','varied return','resolution'],focus:'rhythmic conversation'},
 {form:['pickup','melodic answer','development','quiet ending'],focus:'melodic development'},
 {form:['bass idea','space','layered response','breakdown','final variation'],focus:'bass and silence'}],
 catalogue:inferCatalogueTaste(p.catalogue??[]),audio_generated:false,training_opt_in:false};}

export function tasteRender(profile:Taste,seed:number,seconds:number,direction:number){
 const p=validateTaste(profile);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(seconds)||seconds<30||seconds>180||!Number.isInteger(direction)||direction<0||direction>2)throw new Error('Invalid composition request');
 const mask=['piano','guitar','bass','drums','synth'].reduce((n,name,i)=>n|(p.instruments.includes(name)?1<<i:0),0);
 if(!mask)throw new Error('Choose at least one instrument. Voice requires a consented recording in AI Improvisation.');
 return {seed,tempo:p.tempo,energy:energies.indexOf(p.energy),instruments:mask,novelty:p.novelty,seconds,direction};
}
