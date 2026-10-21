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
