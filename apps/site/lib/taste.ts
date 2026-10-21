export const energies=['gentle','balanced','intense'] as const;
export const instruments=['piano','guitar','bass','drums','synth','voice'] as const;
export type Taste={version:1;references:string[];energy:typeof energies[number];tempo:number;instruments:string[];novelty:number};
export const emptyTaste:Taste={version:1,references:[],energy:'balanced',tempo:110,instruments:['piano','bass','drums'],novelty:50};
export function validateTaste(value:unknown):Taste{
 if(!value||typeof value!=='object')throw new Error('Invalid preference profile');
 const p=value as Taste;
 if(p.version!==1||!Array.isArray(p.references)||p.references.length>20||p.references.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||
 !energies.includes(p.energy)||!Number.isInteger(p.tempo)||p.tempo<60||p.tempo>180||!Number.isInteger(p.novelty)||p.novelty<0||p.novelty>100||
 !Array.isArray(p.instruments)||!p.instruments.length||p.instruments.length>6||new Set(p.instruments).size!==p.instruments.length||p.instruments.some(i=>!instruments.includes(i as typeof instruments[number])))throw new Error('Invalid preference profile');
 return {version:1,references:p.references.map(s=>s.trim()),energy:p.energy,tempo:p.tempo,instruments:[...p.instruments],novelty:p.novelty};
}
export function tasteBrief(profile:Taste){const p=validateTaste(profile);return {
 schema_version:'1.0-taste-brief',origin:'explicit_user_preferences',tempo_bpm:p.tempo,energy:p.energy,instruments:p.instruments,
 novelty:p.novelty,reference_count:p.references.length,
 unknown:['reference tempo','reference harmony','reference melody','reference audio features'],
 proposals:[{form:['sparse motif','interlocking groove','contrast','varied return','resolution'],focus:'rhythmic conversation'},
 {form:['pickup','melodic answer','development','quiet ending'],focus:'melodic development'},
 {form:['bass idea','space','layered response','breakdown','final variation'],focus:'bass and silence'}],
 audio_generated:false,training_opt_in:false};}
