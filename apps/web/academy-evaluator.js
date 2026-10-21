export const EVALUATOR_VERSION = 'academy-2';
export const STATES = ['available','preparing','demonstrate','guided_attempt','verify','passed','free_jam','completed','paused','failed_attempt'];
const finite = n => Number.isFinite(n);
export function evaluateTask(task, evidence) {
  const fail = feedback => ({pass:false,feedback});
  if(!task || !Array.isArray(evidence?.samples) || !Array.isArray(evidence?.actions) || evidence.samples.length>(task.kind==='recording'?3602:180) || evidence.actions.length>(task.kind==='recording'?2048:100))
    return fail('Invalid or oversized evidence. Retry this task.');
  const {samples,actions}=evidence;
  if(samples.some(s=>!s||typeof s!=='object')||actions.some(a=>!a||typeof a!=='object'||!finite(a.t)||a.t<0||!['user','coach_demo','system'].includes(a.source)||typeof a.control!=='string'))return fail('Invalid assessment evidence.');
  if(task.kind==='knowledge'){
    const answer=actions.at(-1);
    return answer?.source==='user'&&answer.control===task.control&&answer.value===task.answer
      ?{pass:true,feedback:task.success,metrics:{answer:answer.value}}
      :fail(task.remediation);
  }
  if(samples.length<8)return fail('Keep the music playing a little longer.');
  if(samples.some((s,i)=>!['t','a','b','x','master','peak','rms','rateA','rateB','levelA','levelB'].every(k=>finite(s[k])) ||
    s.t<0 || s.peak<0 || s.peak>10 || s.rms<0 || s.rms>10 || s.a<0 || s.b<0 ||
    s.x<0 || s.x>1 || s.master<0 || s.master>1 || s.levelA<0 || s.levelA>1 || s.levelB<0 || s.levelB>1 ||
    s.rateA<.84 || s.rateA>1.16 || s.rateB<.84 || s.rateB>1.16 || (i && (s.t<=samples[i-1].t || s.t-samples[i-1].t>(task.kind==='recording'?1.6:.5)))))
    return fail('Audio timing was interrupted. Keep this tab visible and retry.');
  if(actions.some(a=>!finite(a.t)||!['user','coach_demo','system'].includes(a.source)||typeof a.control!=='string'))return fail('Invalid action evidence.');
  const user=actions.filter(a=>a.source==='user'&&a.control===task.control&&a.t>=samples[0].t-(task.kind==='recording'?1.6:.25)&&a.t<=samples.at(-1).t);
  if(!user.length)return fail('Your turn: use the highlighted control. Demonstrations do not count.');
  if(task.allowedAssists?.includes('manual_only')&&actions.some(a=>a.source==='coach_demo'||a.control?.startsWith('match-')||a.control?.startsWith('align-')))return fail('This check is manual. Retry without tempo match, grid alignment or demonstrations.');
  const tail=samples.filter(s=>s.t>=user[0].t),span=(tail.at(-1)?.t??0)-(tail[0]?.t??0);
  if(tail.length<6||span<(task.seconds??1)-(task.kind==='recording'?1.2:0))return fail('Hold the change while the music plays.');
  if(tail.some(s=>s.peak>=.79))return fail('The mix is too hot. Lower Master, then try again.');
  if(tail.filter(s=>s.rms<.0005).length>tail.length*.2)return fail('The output is silent. Check Play, channel levels and Master.');
  if(task.kind==='play'){
    // Native decoders can start before the analyser has a full window. Grade sustained signal after startup.
    let start=tail.length-1;while(start>=0&&tail[start][task.deck]>=.0005)start--;
    if(start===tail.length-1||tail.at(-1).t-tail[start+1].t<(task.seconds??1)-.05)
      return fail(`Deck ${task.deck.toUpperCase()} needs a longer audible stretch. Press Play and let it run.`);
  } else if(task.kind==='fade') {
    const initial=samples.findIndex(s=>s.x<=.03),move=samples.findIndex((s,i)=>i>initial&&s.x>.03),from=move-1,to=samples.findIndex((s,i)=>i>from&&s.x>=.97);
    if(initial<0||from<0||to<0)return fail('Start with the crossfader at A and finish at B.');
    const fade=samples.slice(from,to+1),moving=fade.findIndex(s=>s.x>.03);
    if(fade.some(s=>s.peak>=.79))return fail('The mix is too hot. Lower Master, then try again.');
    if(fade.filter(s=>s.rms<.0005).length>fade.length*.2)return fail('The output is silent during the transition. Keep the music audible.');
    if(moving<1)return fail('Begin at A before moving.');
    const seconds=fade.at(-1).t-fade[moving-1].t,beats=seconds*task.bpm/60;
    if(beats<(task.beats??8)*.8||beats>(task.beats??8)*1.2)return fail(`You moved across ${beats.toFixed(1)} beats. Aim for a gradual ${task.beats??8}-beat fade.`);
    if(fade.some(s=>s.a<.0005||s.b<.0005))return fail('Keep both decks playing throughout the fade.');
    if(fade.some(s=>Math.abs(s.rateA-1)>.001||Math.abs(s.rateB-1)>.001))return fail('Reset both pitch controls to the original 120 BPM before this exercise.');
    if(fade.some((s,i)=>i&& (s.x<fade[i-1].x-.06||s.x-fade[i-1].x>.22)))return fail('Move gradually from A to B without jumps or reversing.');
    if(user.length<8)return fail('Use several small movements, not one jump.');
    return {pass:true,feedback:task.success??'Eight-beat fade checked. The music is yours—keep playing.',metrics:{seconds,beats,peak:Math.max(...fade.map(s=>s.peak))}};
  } else if(task.kind==='value') {
    const last=user.at(-1),field={master:'master','level-a':'levelA','level-b':'levelB','eq-a-0':'bassA','eq-b-0':'bassB','tone-a':'toneA','echo-a':'echoA','rack-level':'rackLevel'}[task.control];
    if(!field||!finite(last.value)||last.value<task.min||last.value>task.max)return fail(task.remediation);
    const held=tail.filter(s=>s.t>=tail.at(-1).t-task.seconds-.1);
    if(held.length<6||held.some(s=>!finite(s[field])||s[field]<task.min||s[field]>task.max))return fail('Hold the requested level while the music plays.');
  } else if(task.kind==='tempo') {
    const held=tail.filter(s=>s.t>=tail.at(-1).t-task.seconds);
    if(held.some(s=>Math.abs(s.rateA*task.bpmA-s.rateB*task.bpmB)>.3))return fail('Keep both tempos within 0.3 BPM for the full check.');
    if(task.phase&&held.some(s=>{if(!finite(s.positionA)||!finite(s.positionB))return true;const delta=Math.abs(s.positionA*task.bpmA/60-s.positionB*task.bpmB/60)%1;return Math.min(delta,1-delta)>.12;}))return fail('Nudge Deck B until the declared grids remain within 0.12 beats. This measures the grid, not an independently verified downbeat.');
    if(held.some(s=>s.a<.0005||s.b<.0005))return fail('Both decks must keep playing for the alignment check.');
  } else if(task.kind==='instrument'){
    const held=tail.filter(s=>s.t>=tail.at(-1).t-task.seconds);
    if(held.some(s=>!finite(s.rack)||s.rack<.0005||s.a<.0005))return fail('Keep A playing and hold a piano note with the instrument level audible.');
  } else if(task.kind==='transport') {
    const event=user.at(-1),before=event[task.deck==='b'?'beforeB':'beforeA'],after=event[task.deck==='b'?'afterB':'afterA'];
    if(!finite(before)||!finite(after)||(task.destination!==undefined?Math.abs(after-task.destination)>.3||Math.abs(after-before)<2:Math.abs((after-before)-task.delta)>.3))return fail(task.remediation);
  } else if(task.kind==='loop') {
    const held=tail.filter(s=>s.t>=tail.at(-1).t-task.seconds),field=task.deck==='b'?'loopB':'loopA';
    if(held.some(s=>s[field]!==task.expected||(task.expected===1&&(!finite(s[task.deck==='b'?'loopBeatsB':'loopBeatsA'])||Math.abs(s[task.deck==='b'?'loopBeatsB':'loopBeatsA']-(task.beats??8))>.01))))return fail(task.remediation);
  } else if(task.kind==='tap') {
    if(user.length<8)return fail('Tap eight steady beats while the music plays.');
    const intervals=user.slice(-8).slice(1).map((a,i)=>a.t-user.slice(-8)[i].t),beat=60/task.bpm;
    if(intervals.some(n=>Math.abs(n-beat)>.12))return fail('Keep eight taps evenly spaced at the displayed tempo.');
  } else if(task.kind==='recording') {
    const r=evidence.recording;
    if(!r||r.version!==1||!Number.isSafeInteger(r.frames)||!finite(r.rate)||r.rate<32000||r.rate>192000||r.frames<1||r.frames/r.rate>3601||r.seconds!==r.frames/r.rate||r.gaps!==0||!Number.isSafeInteger(r.bytes)||r.bytes<1||r.bytes>96*1024*1024||!/^audio\/(webm;codecs=opus|mp4)$/.test(r.mime)||!/^[a-f0-9]{64}$/.test(r.sha256))return fail('Finish a valid uninterrupted recording before checking the set.');
    if(r.seconds<task.seconds||Math.abs(r.seconds-(samples.at(-1).t-samples[0].t))>2.5)return fail('Record the full requested duration with continuous audio measurements.');
    let side=samples[0].x<.1?'a':samples[0].x>.9?'b':null,departure=null,middle=0,transitions=0,quiet=0;
    for(const [i,sample] of samples.entries()){
      quiet=sample.rms<.0005?quiet+1:0;if(quiet>=2)return fail('The recording contains sustained silence. Keep a source audible during changes.');
      const next=sample.x<.1?'a':sample.x>.9?'b':null;
      if(!next){departure??=samples[Math.max(0,i-1)].t;middle++;}
      else if(next!==side){if(side&&departure!==null&&sample.t-departure>=3&&middle>=2)transitions++;side=next;departure=null;middle=0;}
      else{departure=null;middle=0;}
    }
    if(transitions<task.transitions)return fail(`Measured ${transitions} transitions. Make at least ${task.transitions} deliberate changes between A and B.`);
    if(task.recovery){
      const cue=actions.find(a=>a.source==='user'&&a.control==='cue-b'&&a.t>=samples[0].t&&a.t<=samples.at(-1).t);
      if(!cue)return fail('Include the requested Deck B cue/restart recovery during the recording.');
      const atCue=samples.find(s=>s.t>=cue.t);
      if(!atCue||atCue.x>.1||atCue.a<.0005)return fail('Keep A audible with the crossfader at A while recovering B.');
      if(!actions.some(a=>a.source==='user'&&a.control==='play-b'&&a.t>cue.t&&a.t<=samples.at(-1).t))return fail('Restart Deck B after the cue recovery.');
    }
    return {pass:true,feedback:task.success,metrics:{seconds:r.seconds,transitions,peak:Math.max(...samples.map(s=>s.peak)),sha256:r.sha256}};
  } else return fail('This rubric is not supported.');
  return {pass:true,feedback:task.success,metrics:{seconds:span,peak:Math.max(...tail.map(s=>s.peak))}};
}

export class LessonRun {
  constructor(lesson){this.lesson=lesson;this.index=0;this.state='available';this.results=[];this.samples=[];this.actions=[];this.recording=null;}
  begin(){if(!['available','free_jam','failed_attempt','paused'].includes(this.state))return;this.samples=[];this.actions=[];this.recording=null;this.state='guided_attempt';}
  observe(sample){if(this.state!=='guided_attempt'||sample.t<=0||sample.t<=(this.samples.at(-1)?.t??-1))return;this.samples.push(sample);if(this.samples.length>(this.lesson.tasks[this.index].kind==='recording'?3602:180))this.samples.shift();}
  action(event){if(this.state==='guided_attempt'){this.actions.push(event);if(this.actions.length>(this.lesson.tasks[this.index].kind==='recording'?2048:100))this.actions.shift();}}
  verify(){if(this.state!=='guided_attempt')return null;this.state='verify';const evidence={samples:this.samples,actions:this.actions,...(this.recording?{recording:this.recording}:{})};
    const result=evaluateTask(this.lesson.tasks[this.index],evidence);this.state=result.pass?'free_jam':'failed_attempt';
    if(result.pass)this.results[this.index]={taskId:this.lesson.tasks[this.index].id,evidence,result};return result;}
  next(){if(this.state!=='free_jam')return false;if(++this.index===this.lesson.tasks.length){this.state='completed';return true;}this.begin();return false;}
  pause(){if(['guided_attempt','failed_attempt'].includes(this.state)){this.samples=[];this.actions=[];this.state='paused';}}
}
