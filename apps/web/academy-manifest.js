export const LESSON_VERSION='2026.10.2';
export function validateLesson(lesson){
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=1000;
 const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,79}$/.test(v);
 if(!lesson||lesson.version!==LESSON_VERSION||!id(lesson.id)||!id(lesson.level)||!text(lesson.title)||typeof lesson.free!=='boolean'||
  !Array.isArray(lesson.prerequisites)||!lesson.prerequisites.every(id)||!Array.isArray(lesson.tasks)||!lesson.tasks.length||lesson.tasks.length>20)throw Error('Invalid Academy lesson manifest');
 const ids=new Set();
 for(const task of lesson.tasks){
  if(!task||!id(task.id)||ids.has(task.id)||!id(task.control)||!['play','fade','value','tempo','transport','loop','tap','recording','knowledge','instrument'].includes(task.kind)||
   !['objective','why','remediation','success','practice','startCondition'].every(k=>text(task[k]))||
   !Number.isFinite(task.seconds)||task.seconds<1||task.seconds>(task.kind==='recording'?3600:16)||task.maxAttempts!==3||
   !Array.isArray(task.referenceAudioIds)||task.referenceAudioIds.join(',')!=='extended,theories'||
   !Array.isArray(task.allowedAssists)||task.allowedAssists.some(a=>!['coach_demo','visual_controls','manual_only'].includes(a))||
   (['play','transport','loop'].includes(task.kind)&&!['a','b'].includes(task.deck))||
   (['fade','tap'].includes(task.kind)&&(!Number.isFinite(task.bpm)||task.bpm<40||task.bpm>240))||
   (task.kind==='value'&&(!Number.isFinite(task.min)||!Number.isFinite(task.max)||task.min>task.max))||
   (task.kind==='tempo'&&![task.bpmA,task.bpmB].every(n=>Number.isFinite(n)&&n>=40&&n<=240))||
   (task.kind==='transport'&&!Number.isFinite(task.delta)&&!Number.isFinite(task.destination))||(task.kind==='loop'&&![0,1].includes(task.expected))||
   (task.kind==='knowledge'&&(!Array.isArray(task.choices)||task.choices.length!==3||!task.choices.every(text)||!Number.isInteger(task.answer)||task.answer<0||task.answer>2))||
   (task.kind==='recording'&&(!Number.isInteger(task.transitions)||task.transitions<1||task.transitions>100)))throw Error('Invalid Academy task manifest');
  ids.add(task.id);
 }
 return lesson;
}
