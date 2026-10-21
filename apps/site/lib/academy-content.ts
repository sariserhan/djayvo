import {validateLesson,LESSON_VERSION} from '../../web/academy-manifest.js';
export const ACADEMY_VERSION=LESSON_VERSION;
export const ACADEMY_PRICE_CENTS=7999;
// Independent from generation quality; course/audio/novice/payment release evidence is still missing.
export const academySalesReleased=false;
export type AcademyTask={id:string;objective:string;control:string;kind:'play'|'fade'|'value'|'tempo'|'action';
 deck?:'a'|'b';seconds:number;bpm?:number;bpmA?:number;bpmB?:number;min?:number;max?:number;
 startCondition:string;allowedAssists:string[];referenceAudioIds:string[];maxAttempts:number;why:string;remediation:string;success:string;practice:string};
export type AcademyLesson={id:string;title:string;level:string;version:string;free:boolean;prerequisites:string[];tasks:AcademyTask[]};
export const academyLevels=[
 {slug:'intro',name:'Start here',number:0,description:'Make sound, meet the decks and make your first eight-beat transition.'},
 {slug:'beginner',name:'Find your rhythm',number:1,description:'Transport, cues, levels and a clean guided transition.'},
 {slug:'elementary',name:'Make room in the mix',number:2,description:'Tempo matching, EQ and purposeful bass swaps.'},
 {slug:'intermediate',name:'Shape a transition',number:3,description:'Hot cues, tone and echo with restraint. Longer recorded assessments are still in development.'},
 {slug:'advanced',name:'Stay in control',number:4,description:'Recovery and creative layering. Multi-deck scenarios need further implementation and testing.'},
 {slug:'performance',name:'Prepare a set',number:5,description:'Set planning, recordings and interruption drills. Venue-readiness assessment is not released.'},
];
const task=(id:string,objective:string,control:string,kind:AcademyTask['kind'],extra:Partial<AcademyTask>={}):AcademyTask=>({id,objective,control,kind,seconds:1.5,
 startCondition:'Load both approved practice tracks and confirm playback permission.',allowedAssists:['coach_demo','visual_controls'],referenceAudioIds:['extended','theories'],maxAttempts:3,
 why:'The check measures the real audio path and your control actions. A coach demonstration never earns your check.',
 remediation:'Keep the music playing, use the highlighted control, and try again.',success:'Checked from your deck actions and audio measurements.',
 practice:'Keep playing for as long as you like. Continue only when you are ready.',...extra});
export const academyLessons:AcademyLesson[]=[{id:'first-crossfade',title:'Your first crossfade',level:'intro',version:ACADEMY_VERSION,free:true,prerequisites:[],tasks:[
 task('play-a','Press Play A. Let the music play for two seconds.','play-a','play',{deck:'a'}),
 task('play-b','Press Play B. Both tracks should be running.','play-b','play',{deck:'b',why:'B can be playing while the crossfader keeps it out of the speakers. Its real channel signal is measured.'}),
 task('fade','Move the crossfader from A to B over eight beats—about four seconds.','crossfade','fade',{bpm:120,seconds:1,
 why:'Count 1–2–3–4 twice. A fades out as B fades in. We assess duration, smooth movement and active audio—not exact beat phase or artistic taste.',
 remediation:'Reset the crossfader to A. Start both decks and move gradually over eight beats.'}),
 ]},{id:'gain-staging',title:'Leave room in the mix',level:'beginner',version:ACADEMY_VERSION,free:false,prerequisites:['first-crossfade'],tasks:[
 task('start-a','Start Deck A with the crossfader at A.','play-a','play',{deck:'a'}),
 task('lower-master','Lower Master to 50% and hold it for two seconds.','master','value',{min:.48,max:.52,why:'Master controls the final output. Leaving headroom reduces the risk of clipping; your physical speaker volume is separate.',remediation:'Use Master, not a channel fader. Set it near 50% and keep the track playing.'}),
 task('restore-master','Bring Master back to 75% and hold it for two seconds.','master','value',{min:.73,max:.77,remediation:'Set Master near 75%. Keep Deck A playing and the crossfader at A.'}),
]}];
for(const lesson of academyLessons)validateLesson(lesson);
export function academyLesson(id:string){return academyLessons.find(l=>l.id===id);}
