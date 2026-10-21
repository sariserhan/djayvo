export const EVALUATOR_VERSION = 'academy-1';
export const STATES = ['available','preparing','demonstrate','guided_attempt','verify','passed','free_jam','completed','paused','failed_attempt'];
const finite = n => Number.isFinite(n);
export function evaluateTask(task, evidence) {
  const fail = feedback => ({pass:false,feedback});
  if(!task || !Array.isArray(evidence?.samples) || !Array.isArray(evidence?.actions) || evidence.samples.length>180 || evidence.actions.length>100)
    return fail('Invalid or oversized evidence. Retry this task.');
  const {samples,actions}=evidence;
  if(samples.length<8)return fail('Keep the music playing a little longer.');
  if(samples.some((s,i)=>!['t','a','b','x','master','peak','rms','rateA','rateB','levelA','levelB'].every(k=>finite(s[k])) ||
    s.t<0 || s.peak<0 || s.peak>10 || s.rms<0 || s.rms>10 || s.a<0 || s.b<0 ||
    s.x<0 || s.x>1 || s.master<0 || s.master>1 || s.levelA<0 || s.levelA>1 || s.levelB<0 || s.levelB>1 ||
    s.rateA<.84 || s.rateA>1.16 || s.rateB<.84 || s.rateB>1.16 || (i && (s.t<=samples[i-1].t || s.t-samples[i-1].t>.5))))
    return fail('Audio timing was interrupted. Keep this tab visible and retry.');
  if(actions.some(a=>!finite(a.t)||!['user','coach_demo','system'].includes(a.source)||typeof a.control!=='string'))return fail('Invalid action evidence.');
  const user=actions.filter(a=>a.source==='user'&&a.control===task.control&&a.t>=samples[0].t-.25&&a.t<=samples.at(-1).t);
  if(!user.length)return fail('Your turn: use the highlighted control. Demonstrations do not count.');
  const tail=samples.filter(s=>s.t>=user[0].t),span=(tail.at(-1)?.t??0)-(tail[0]?.t??0);
  if(tail.length<6||span<(task.seconds??1))return fail('Hold the change while the music plays.');
  if(tail.some(s=>s.peak>=.79))return fail('The mix is too hot. Lower Master, then try again.');
  if(tail.filter(s=>s.rms<.0005).length>tail.length*.2)return fail('The output is silent. Check Play, channel levels and Master.');
  if(task.kind==='play'){
    // Native decoders can start before the analyser has a full window. Grade sustained signal after startup.
    let start=tail.length-1;while(start>=0&&tail[start][task.deck]>=.0005)start--;
    if(start===tail.length-1||tail.at(-1).t-tail[start+1].t<(task.seconds??1)-.05)
      return fail(`Deck ${task.deck.toUpperCase()} needs a longer audible stretch. Press Play and let it run.`);
  } else if(task.kind==='fade') {
    const from=samples.findIndex(s=>s.x<=.03),to=samples.findIndex((s,i)=>i>from&&s.x>=.97);
    if(from<0||to<0)return fail('Start with the crossfader at A and finish at B.');
    const fade=samples.slice(from,to+1),moving=fade.findIndex(s=>s.x>.03);
    if(moving<1)return fail('Begin at A before moving.');
    const seconds=fade.at(-1).t-fade[moving-1].t,beats=seconds*task.bpm/60;
    if(beats<6.5||beats>9.5)return fail(`You moved across ${beats.toFixed(1)} beats. Aim for a gradual eight-beat fade.`);
    if(fade.some(s=>s.a<.0005||s.b<.0005))return fail('Keep both decks playing throughout the fade.');
    if(fade.some(s=>Math.abs(s.rateA-1)>.001||Math.abs(s.rateB-1)>.001))return fail('Reset both pitch controls to the original 120 BPM before this exercise.');
    if(fade.some((s,i)=>i&& (s.x<fade[i-1].x-.06||s.x-fade[i-1].x>.22)))return fail('Move gradually from A to B without jumps or reversing.');
    if(user.length<8)return fail('Use several small movements, not one jump.');
    return {pass:true,feedback:'Eight-beat fade checked. The music is yours—keep playing.',metrics:{seconds,beats,peak:Math.max(...fade.map(s=>s.peak))}};
  } else if(task.kind==='value') {
    const last=user.at(-1),field={master:'master','level-a':'levelA','level-b':'levelB'}[task.control];
    if(!field||!finite(last.value)||last.value<task.min||last.value>task.max)return fail(task.remediation);
    const held=tail.filter(s=>s.t>=tail.at(-1).t-task.seconds-.1);
    if(held.length<6||held.some(s=>s[field]<task.min||s[field]>task.max))return fail('Hold the requested level while the music plays.');
  } else if(task.kind==='tempo') {
    const error=Math.abs(tail.at(-1).rateA*task.bpmA-tail.at(-1).rateB*task.bpmB);
    if(error>.3)return fail(`Tempo difference is ${error.toFixed(1)} BPM. Adjust Deck B’s rate; this does not align beat phase.`);
  } else if(task.kind!=='action')return fail('This rubric is not supported.');
  return {pass:true,feedback:task.success,metrics:{seconds:span,peak:Math.max(...tail.map(s=>s.peak))}};
}

export class LessonRun {
  constructor(lesson){this.lesson=lesson;this.index=0;this.state='available';this.results=[];this.samples=[];this.actions=[];}
  begin(){if(!['available','free_jam','failed_attempt','paused'].includes(this.state))return;this.samples=[];this.actions=[];this.state='guided_attempt';}
  observe(sample){if(this.state!=='guided_attempt'||sample.t<=0||sample.t<=(this.samples.at(-1)?.t??-1))return;this.samples.push(sample);if(this.samples.length>180)this.samples.shift();}
  action(event){if(this.state==='guided_attempt'){this.actions.push(event);if(this.actions.length>100)this.actions.shift();}}
  verify(){if(this.state!=='guided_attempt')return null;this.state='verify';const evidence={samples:this.samples,actions:this.actions};
    const result=evaluateTask(this.lesson.tasks[this.index],evidence);this.state=result.pass?'free_jam':'failed_attempt';
    if(result.pass)this.results[this.index]={taskId:this.lesson.tasks[this.index].id,evidence,result};return result;}
  next(){if(this.state!=='free_jam')return false;if(++this.index===this.lesson.tasks.length){this.state='completed';return true;}this.begin();return false;}
  pause(){if(this.state==='guided_attempt'){this.samples=[];this.actions=[];this.state='paused';}}
}
