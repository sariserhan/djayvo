import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMixReplay, inspectReplayWav, renderDeckActions } from '../mix-replay.js';
import { stereoWav } from '../live-take.js';
import { stemWav } from '../mix-stems.js';
import { replayFixture } from './mix-replay-fixture.js';

test('replay requires coherent bounded receipt/source/control/transport clocks and complete notes',()=>{
  assert.equal(validateMixReplay(replayFixture()).frames,48000);
  for(const edit of [p=>p.extra=true,p=>p.recording.timestamp_discontinuities=1,
    p=>p.automation.wav_sha256='b'.repeat(64),p=>p.transport.events[0].context_frame=100,
    p=>p.sources.snapshots[0].context_frame=1,p=>p.instrument={},
    p=>p.transport.events.push({...structuredClone(p.transport.events[0]),context_frame:100000}),
    p=>{p.sources.assets.push({kind:'instrument_engine',sha256:'b'.repeat(64),bytes:10});p.sources.snapshots[0].rack=0;}]){
    const p=replayFixture();edit(p);assert.throws(()=>validateMixReplay(p));
  }
});
test('PCM bounds are checked before decoder allocation, including finite float samples',()=>{
  const bytes=stereoWav(new Float32Array(256).fill(.1),128,48000);
  assert.deepEqual(inspectReplayWav(bytes),{channels:2,rate:48000,frames:128});
  const floats=stemWav(new Float32Array(256).fill(1.5),128,48000);
  assert.equal(inspectReplayWav(floats).frames,128);
  for(const edit of [v=>v.setUint32(4,1,true),v=>v.setUint16(20,6,true),v=>v.setUint32(24,1,true),
    v=>v.setUint16(22,40,true),v=>v.setUint32(40,999999,true),v=>v.setUint16(32,0,true)]){
    const data=bytes.slice(0);edit(new DataView(data));assert.throws(()=>inspectReplayWav(data));
  }
  new DataView(floats).setFloat32(58,NaN,true);assert.throws(()=>inspectReplayWav(floats),/float/);
  assert.throws(()=>inspectReplayWav(bytes.slice(0,-1)));
});
test('shared deck replay applies source, play, seek, scratch, loop and stop at declared frames',()=>{
  const p=replayFixture(),pcm=Float32Array.from({length:48000},(_,i)=>Math.sin(i*.031)*.2);
  const decoded=new Map([[0,{duration:1,numberOfChannels:1,getChannelData:()=>pcm}]]);
  p.sources.snapshots[0].a=0;
  const state=p.transport.events[0].state;
  Object.assign(state.a,{mode:'worklet',duration_seconds:1,playing:true});
  const push=(frame,action,changes)=>{const next=structuredClone(p.transport.events.at(-1));next.context_frame=frame;next.action=action;next.target='a';Object.assign(next.state.a,changes);p.transport.events.push(next);};
  push(6000,'rate',{rate:1.1,key_lock:true});push(12000,'seek',{position_seconds:.5});
  push(18000,'loop',{loop:true,region_seconds:[.2,.4]});
  push(24000,'scratch',{loop:false,scratching:true,scratch_speed:-2});
  push(30000,'scratch-end',{scratching:false,scratch_speed:0});push(36000,'pause',{playing:false});
  const timing={start:0,frames:48000,rate:48000};
  const a=renderDeckActions(p,'a',decoded,timing),b=renderDeckActions(p,'a',decoded,timing);
  assert.deepEqual(a,b);assert.ok(a[0].some(v=>Math.abs(v)>.01));assert.ok(a[0].every(Number.isFinite));
  assert.ok(a[0].slice(37000).every(v=>v===0));assert.deepEqual(a[0],a[1]);
  assert.throws(()=>renderDeckActions(p,'a',new Map(),timing),/source/);
});

test('extensible PCM validates its subformat and channel mapping before decoding', () => {
  const original = stereoWav(new Float32Array(256).fill(.2), 128, 48000);
  const bytes = new ArrayBuffer(original.byteLength + 24), v = new DataView(bytes);
  new Uint8Array(bytes).set(new Uint8Array(original).subarray(0, 36));
  new Uint8Array(bytes).set(new Uint8Array(original).subarray(36), 60);
  v.setUint32(4, bytes.byteLength - 8, true); v.setUint32(16, 40, true); v.setUint16(20, 0xfffe, true);
  v.setUint16(36, 22, true); v.setUint16(38, 16, true); v.setUint32(40, 3, true); v.setUint32(44, 1, true);
  new Uint8Array(bytes).set([0,0,16,0,128,0,0,170,0,56,155,113], 48);
  assert.equal(inspectReplayWav(bytes).frames, 128);
  v.setUint8(59, 0); assert.throws(() => inspectReplayWav(bytes), /extensible/);
});

test('sampler replay validates bounded controls and refuses older missing traces',()=>{
 const p=replayFixture();p.sources.schema_version='3.0-mix-sources';
 Object.assign(p.sources.snapshots[0],Object.fromEntries(Array.from({length:8},(_,i)=>['sample'+i,i===0?0:null])));
 p.sources.assets.push({kind:'sampler_audio',sha256:'b'.repeat(64),bytes:100});
 assert.throws(()=>validateMixReplay(p),/no sampler control trace/);
 p.automation.schema_version='4.0-mix-automation';p.automation.initial_sampler=[];
 const start={kind:'sample_start',pad:0,context_frame:128,duration:1,settings:{start:.1,end:.8,pitch:4,level:.7,loop:true}};
 p.automation.events=[start,{kind:'sample_stop',pad:0,context_frame:24000}];assert.equal(validateMixReplay(p).frames,48000);
 for(const change of [s=>s.pad=8,s=>s.duration=Infinity,s=>s.settings.end=2,s=>s.settings.pitch=13,s=>s.settings.extra=1,s=>s.context_frame=-1]){const bad=structuredClone(p);change(bad.automation.events[0]);assert.throws(()=>validateMixReplay(bad));}
 p.automation.initial_sampler=[{pad:0,started_context_frame:0,duration:1,settings:start.settings}];assert.equal(validateMixReplay(p).frames,48000);
 p.automation.initial_sampler.push(p.automation.initial_sampler[0]);assert.throws(()=>validateMixReplay(p),/initial sampler/);
});
