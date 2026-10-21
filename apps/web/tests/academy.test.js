import test from 'node:test';import assert from 'node:assert/strict';import {evaluateTask,LessonRun} from '../academy-evaluator.js';
const task={id:'fade',kind:'fade',control:'crossfade',seconds:1,bpm:120};
function evidence(seconds=4,source='user'){
 const samples=Array.from({length:Math.round(seconds*10)+2},(_,i)=>({t:10+i/10,a:.1,b:.12,x:Math.max(0,Math.min(1,(i-1)/(seconds*10))),master:.5,peak:.3,rms:.1,rateA:1,rateB:1,levelA:1,levelB:1}));
 return {samples,actions:samples.slice(1).map(s=>({t:s.t,control:'crossfade',value:s.x,source}))};
}
test('gradual eight-beat crossfade requires actual signal, timing, progression and learner provenance',()=>{
 assert.equal(evaluateTask(task,evidence()).pass,true);
 for(const e of [evidence(1),evidence(6),evidence(4,'coach_demo'),evidence(4,'system')])assert.equal(evaluateTask(task,e).pass,false);
 const silent=evidence();silent.samples.forEach(s=>s.rms=0);assert.match(evaluateTask(task,silent).feedback,/silent/);
 const stopped=evidence();stopped.samples[20].b=0;assert.match(evaluateTask(task,stopped).feedback,/both decks/);
 const jump=evidence();jump.samples[20].x=.95;assert.equal(evaluateTask(task,jump).pass,false);
 const hot=evidence();hot.samples[15].peak=.9;assert.match(evaluateTask(task,hot).feedback,/too hot/);
 const gap=evidence();gap.samples[10].t+=1;assert.match(evaluateTask(task,gap).feedback,/interrupted/);
 const invalid=evidence();invalid.samples[2].t=NaN;assert.equal(evaluateTask(task,invalid).pass,false);
 assert.match(evaluateTask(task,evidence(1)).feedback,/2.0 beats/);
});
test('checks lead to ungraded free play, never automatic next task; pauses discard stale attempts',()=>{
 const run=new LessonRun({tasks:[task,task]});run.begin();const e=evidence();e.samples.forEach(s=>run.observe(s));e.actions.forEach(a=>run.action(a));
 assert.equal(run.verify().pass,true);assert.equal(run.state,'free_jam');assert.equal(run.index,0);
 const length=run.samples.length;run.observe({...e.samples[0],t:100});run.action({source:'user'});assert.equal(run.samples.length,length);
 assert.equal(run.verify(),null);run.next();assert.equal(run.index,1);assert.equal(run.state,'guided_attempt');
 run.pause();assert.equal(run.samples.length,0);run.begin();assert.equal(run.state,'guided_attempt');assert.equal(run.results.length,1);
});

test('native decoder startup may settle, but a sustained audible interval is required',()=>{
 const task={kind:'play',deck:'a',control:'play-a',seconds:1.5,success:'Checked'};
 const data={samples:Array.from({length:26},(_,i)=>({t:1+i*.1,a:i<3?0:.1,b:0,x:0,master:.5,peak:.2,rms:.1,rateA:1,rateB:1,levelA:.8,levelB:.8})),actions:[{t:1,source:'user',control:'play-a'}]};
 assert.equal(evaluateTask(task,data).pass,true);
 assert.equal(evaluateTask(task,{...data,samples:data.samples.map((s,i)=>({...s,a:i===20?0:s.a}))}).pass,false);
});

test('coach commands run the same control handler with distinct provenance and bounds',async()=>{
 const {deckBridge}=await import('../deck-bridge.js');let applied=0;
 const element={id:'crossfade',type:'range',min:'0',max:'1',value:'0',disabled:false,oninput:()=>{applied++;}};
 const bridge=deckBridge(()=>({t:1})),events=[];bridge.bind(element,'oninput','crossfader.set');const unsubscribe=bridge.subscribe(e=>events.push(e));
 await bridge.command('crossfade',.5);assert.equal(applied,1);assert.equal(events[0].source,'coach_demo');
 await element.oninput({target:element});assert.equal(applied,2);assert.equal(events[1].source,'user');assert.ok(events[1].sequence>events[0].sequence);
 await assert.rejects(bridge.command('crossfade',2),/range/);element.disabled=true;await assert.rejects(bridge.command('crossfade',.1),/unavailable/);assert.equal(applied,2);
 unsubscribe();bridge.sample();assert.equal(events.length,2);
});

test('level check needs a sustained actual mixer value, not a brief slider event',()=>{
 const task={kind:'value',control:'master',seconds:1.5,min:.48,max:.52,remediation:'Set Master to 50%.',success:'Checked'};
 const evidence={samples:Array.from({length:25},(_,i)=>({t:1+i*.1,a:.1,b:0,x:0,master:.5,peak:.2,rms:.1,rateA:1,rateB:1,levelA:.8,levelB:.8})),actions:[{t:1,source:'user',control:'master',value:.5}]};
 assert.equal(evaluateTask(task,evidence).pass,true);assert.equal(evaluateTask(task,{...evidence,samples:evidence.samples.map(s=>({...s,master:.9}))}).pass,false);
});

test('tempo holds and declared phase are measured for the entire interval; assisted manual checks fail',()=>{
 const task={kind:'tempo',control:'rate-b',seconds:2,bpmA:120,bpmB:120,phase:true,allowedAssists:['manual_only'],success:'Matched'};
 const e=evidence();e.actions=[{t:10,source:'user',control:'rate-b',value:1}];e.samples.forEach(s=>{s.positionA=s.t;s.positionB=s.t;});
 assert.equal(evaluateTask(task,e).pass,true);
 const wrong=structuredClone(e);wrong.samples[30].rateB=.9;assert.equal(evaluateTask(task,wrong).pass,false);
 const phase=structuredClone(e);phase.samples.forEach(s=>s.positionB+=.15);assert.equal(evaluateTask(task,phase).pass,false);
 e.actions.push({t:11,source:'user',control:'match-b'});assert.equal(evaluateTask(task,e).pass,false);
});
test('loop and jump checks require observed transport changes, not button presses',()=>{
 const e=evidence();e.actions=[{t:10,source:'user',control:'jump-forward-b',beforeB:2,afterB:4}];
 const task={kind:'transport',deck:'b',delta:2,control:'jump-forward-b',seconds:1,success:'Jumped',remediation:'Move four beats.'};
 assert.equal(evaluateTask(task,e).pass,true);e.actions[0].afterB=2;assert.equal(evaluateTask(task,e).pass,false);
 e.actions=[{t:10,source:'user',control:'beat-loop-a'}];e.samples.forEach(s=>{s.loopA=1;s.loopBeatsA=8;});
 assert.equal(evaluateTask({kind:'loop',deck:'a',expected:1,control:'beat-loop-a',seconds:2},e).pass,true);
 e.samples[30].loopA=0;assert.equal(evaluateTask({kind:'loop',deck:'a',expected:1,control:'beat-loop-a',seconds:2},e).pass,false);
});
test('set assessment requires bounded recording, full duration, actual audio continuity and transitions',()=>{
 const task={kind:'recording',seconds:120,transitions:3,control:'set-record-start',success:'Recorded'};
 const samples=Array.from({length:121},(_,i)=>({t:10+i,a:.1,b:.1,x:(Math.floor(i/20)%2?1-Math.min(1,(i%20)/4):Math.min(1,(i%20)/4)),master:.5,peak:.3,rms:.1,rateA:1,rateB:1,levelA:1,levelB:1}));
 const e={samples,actions:[{t:9.1,source:'user',control:'set-record-start'}],recording:{version:1,frames:121*48000,rate:48000,seconds:121,gaps:0,bytes:1000,mime:'audio/webm;codecs=opus',sha256:'a'.repeat(64)}};
 assert.equal(evaluateTask(task,e).pass,true);
 for(const change of [{gaps:1},{seconds:30},{bytes:100*1024*1024},{sha256:'bad'}])assert.equal(evaluateTask(task,{...e,recording:{...e.recording,...change}}).pass,false);
 assert.equal(evaluateTask(task,{...e,samples:samples.map(s=>({...s,x:0}))}).pass,false);
 assert.equal(evaluateTask(task,{...e,samples:samples.map(s=>({...s,rms:0}))}).pass,false);
 const gap=structuredClone(e);gap.samples[15].t+=2;assert.equal(evaluateTask(task,gap).pass,false);
 assert.equal(evaluateTask(task,{...e,actions:[{...e.actions[0],source:'coach_demo'}]}).pass,false);
});

test('knowledge questions are explicit decisions, never mislabeled audio competency',()=>{
 const task={kind:'knowledge',control:'academy-answer',answer:1,success:'Knowledge checked',remediation:'Choose a safe backup.'};
 assert.equal(evaluateTask(task,{samples:[],actions:[{t:1,source:'user',control:'academy-answer',value:1}]}).pass,true);
 for(const action of [{source:'user',value:0},{source:'coach_demo',value:1}])assert.equal(evaluateTask(task,{samples:[],actions:[{t:1,control:'academy-answer',...action}]}).pass,false);
});

test('instrument-layer check requires the separate audible instrument signal with the outgoing deck',()=>{
 const task={kind:'instrument',control:'keyboard',seconds:1.5,success:'Layered'};
 const e=evidence();e.actions=[{t:10,source:'user',control:'keyboard'}];e.samples.forEach(s=>s.rack=.03);
 assert.equal(evaluateTask(task,e).pass,true);e.samples.forEach(s=>s.rack=0);assert.equal(evaluateTask(task,e).pass,false);
});

test('long-set grading rejects abrupt endpoint jumps and sustained silence',()=>{
 const task={kind:'recording',seconds:120,transitions:3,control:'set-record-start'};
 const samples=Array.from({length:121},(_,i)=>({t:10+i,a:.1,b:.1,x:Math.floor(i/20)%2,master:.5,peak:.3,rms:.1,rateA:1,rateB:1,levelA:1,levelB:1}));
 const e={samples,actions:[{t:9.1,source:'user',control:'set-record-start'}],recording:{version:1,frames:121*48000,rate:48000,seconds:121,gaps:0,bytes:1000,mime:'audio/mp4',sha256:'a'.repeat(64)}};
 assert.match(evaluateTask(task,e).feedback,/transitions/);
 e.samples[12].rms=0;e.samples[13].rms=0;assert.match(evaluateTask(task,e).feedback,/sustained silence/);
 for(const malformed of [null,[],{samples:[null],actions:[null]}])assert.equal(evaluateTask(task,malformed).pass,false);
});

test('five-minute and performance rubrics accept full bounded traces, not shortened recordings',()=>{
 for(const seconds of [300,1800,3600]){
  const samples=Array.from({length:seconds},(_,i)=>({t:10+i,a:.1,b:.1,x:Math.floor(i/20)%2?1-Math.min(1,i%20/4):Math.min(1,i%20/4),master:.5,peak:.3,rms:.1,rateA:1,rateB:1,levelA:1,levelB:1}));
  const task={kind:'recording',seconds,transitions:12,control:'set-record-start'},e={samples,actions:[{t:9.1,source:'user',control:'set-record-start'}],recording:{version:1,frames:seconds*48000,rate:48000,seconds,gaps:0,bytes:seconds*16000,mime:'audio/webm;codecs=opus',sha256:'b'.repeat(64)}};
  assert.equal(evaluateTask(task,e).pass,true,String(seconds));
  assert.equal(evaluateTask(task,{...e,recording:{...e.recording,frames:120*48000,seconds:120}}).pass,false);
 }
});

test('fade grading starts when the fader moves, not while the learner is still starting the decks',()=>{
 const e=evidence();const preparation=Array.from({length:10},(_,i)=>({...e.samples[0],t:9+i/10,a:0,b:0}));
 assert.equal(evaluateTask(task,{...e,samples:[...preparation,...e.samples]}).pass,true);
});

test('set recovery must happen inside the recording, in order, with A supplying the music',()=>{
 const task={kind:'recording',seconds:120,transitions:3,recovery:true,control:'set-record-start'};
 const samples=Array.from({length:121},(_,i)=>({t:10+i,a:.1,b:.1,x:Math.floor(i/20)%2?1-Math.min(1,i%20/4):Math.min(1,i%20/4),master:.5,peak:.3,rms:.1,rateA:1,rateB:1,levelA:1,levelB:1}));
 const e={samples,actions:[{t:9.1,source:'user',control:'set-record-start'},{t:35,source:'user',control:'cue-b'},{t:36,source:'user',control:'play-b'}],recording:{version:1,frames:121*48000,rate:48000,seconds:121,gaps:0,bytes:1000,mime:'audio/mp4',sha256:'a'.repeat(64)}};
 assert.equal(evaluateTask(task,e).pass,true);
 e.actions[2].t=34;assert.match(evaluateTask(task,e).feedback,/after the cue/);
 e.actions[1].t=1;assert.match(evaluateTask(task,e).feedback,/during the recording/);
});
test('failed tasks can pause into ungraded practice and resume with fresh evidence',()=>{const run=new LessonRun({tasks:[task]});run.begin();run.verify();assert.equal(run.state,'failed_attempt');run.pause();assert.equal(run.state,'paused');run.begin();assert.equal(run.state,'guided_attempt');assert.equal(run.actions.length,0);});
