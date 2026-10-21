import test from 'node:test';import assert from 'node:assert/strict';import {StepSequence,validPattern} from '../step-sequence.js';
const pattern={tempo:113,notes:[60,null,64,67,...Array(12).fill(null)]};
function run(block){const s=new StepSequence(48000,pattern,0,90),events=[];let at=0;while(at<48000*30)s.run(Math.min(block,48000*30-at),n=>at+=n,e=>events.push({frame:at,...e}));return events;}
test('sixteenth-note scheduling is sample accurate and independent of callback sizes',()=>{
 const events=run(128);assert.deepEqual(events,run(511));assert.equal(events[0].frame,0);assert.equal(events[1].frame,Math.round(.8*48000*60/113/4));assert.equal(events[2].frame,Math.round(2*48000*60/113/4));assert.equal(events[6].frame,Math.round(16*48000*60/113/4));assert.ok(events.every(e=>e.id>=0xffffff00));
});
test('sequence rejects unsafe tempo, unplayable notes and empty starts',()=>{
 assert.equal(validPattern(pattern),true);for(const change of [{tempo:NaN},{tempo:241},{tempo:39},{tempo:110.5},{notes:[60]},{notes:Array(16).fill(109)}])assert.equal(!!validPattern({...pattern,...change}),false);
 assert.throws(()=>new StepSequence(48000,{...pattern,notes:Array(16).fill(null)},0,90));assert.throws(()=>new StepSequence(48000,{...pattern,notes:Array(16).fill(21)},4,90));assert.throws(()=>new StepSequence(48000,pattern,0,128));
});
