import test from 'node:test';
import assert from 'node:assert/strict';
import { MixTransport, validateMixTransport } from '../mix-transport.js';
import { MAX_MIX_ACTIONS } from '../mix-automation.js';
import { FrameDeck } from '../frame-deck.js';
import { SessionTransport } from '../session-transport.js';

const receipt = {wav_sha256:'a'.repeat(64),sample_rate:48000,observed_context_start_frame:128};
function fixture() {
  const param = () => ({value:1,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
  const context = {currentTime:0,sampleRate:48000,createGain:()=>({gain:param(),connect(){},disconnect(){}}),
    createBufferSource:()=>({playbackRate:param(),connect(){},disconnect(){},start(){},stop(){}})};
  const media = new EventTarget();
  Object.assign(media,{duration:NaN,currentTime:0,playbackRate:1,paused:true,loop:false,preservesPitch:false,
    pause(){this.paused=true;},removeAttribute(){this.duration=NaN;},load(){}});
  const deck = new FrameDeck(media,()=>context,()=>({}));
  const prepared = new SessionTransport(context,now=>now+48000,()=>capture?.record('prepared','prepared',getState,context));
  const getState = () => ({a:deck.transportState(),b:deck.transportState(),prepared:prepared.snapshot()});
  const capture = new MixTransport(getState,context);
  deck.addEventListener('transportchange',event=>capture.record('a',event.action,getState,context));
  return {deck,media,context,capture,prepared,getState};
}
test('transport record covers shared buffer play, rate, seek, roll, pause and prepared scheduling without retaining mutable state',async()=>{
  const {deck,context,capture,prepared}=fixture();
  deck.useBuffer({duration:64});await deck.play();context.currentTime=2;
  deck.startRoll(2,120);context.currentTime=3;deck.playbackRate=1.1;context.currentTime=4;
  deck.exitLoop();deck.currentTime=10;deck.pause();
  const aFrame=prepared.startA({duration:64},{},120000,0);
  const cFrame=prepared.arm({duration:4},{});prepared.stopC();
  const trace=capture.finish(receipt);validateMixTransport(trace,receipt);
  assert.equal(trace.events[0].state.a.mode,'empty');
  for(const action of ['source','play','roll','rate','seek','pause','prepared'])assert.ok(trace.events.some(e=>e.action===action));
  assert.equal(trace.events.find(e=>e.action==='roll').state.a.roll.position_seconds,2);
  assert.equal(trace.events.find(e=>e.action==='seek').state.a.position_seconds,4.1);
  assert.equal(trace.events.find(e=>e.state.prepared?.c).state.prepared.c.start_frame,cFrame);
  assert.equal(trace.events.at(-1).state.prepared.a.start_frame,aFrame);
  assert.equal(trace.events.at(-1).state.prepared.c,null);
  assert.equal(trace.training_authorized,false);
});
test('worklet key-lock, scratch direction and release are recorded without source filenames',async()=>{
  const {deck,capture}=fixture(),commands=[];
  deck.useDSP({duration:64},{connect(){},port:{postMessage:m=>commands.push(m)}});
  deck.preservesPitch=true;deck.currentTime=5;deck.beginScratch();deck.scratch(-2);deck.endScratch();
  const trace=capture.finish(receipt);
  assert.ok(trace.events.some(e=>e.action==='keylock'&&e.state.a.key_lock));
  assert.ok(trace.events.some(e=>e.action==='scratch'&&e.state.a.scratch_speed===-2&&e.state.a.scratching));
  assert.equal(trace.events.at(-1).action,'scratch-end');assert.equal(trace.events.at(-1).state.a.playing,false);
  assert.ok(commands.some(m=>m.type==='scratch'&&m.speed===-2));
});
test('native decoder events and controls use observed context frames',()=>{
  const {deck,media,context,capture}=fixture();
  media.duration=20;media.dispatchEvent(new Event('loadedmetadata'));
  context.currentTime=.5;media.paused=false;media.dispatchEvent(new Event('play'));
  deck.currentTime=3;deck.playbackRate=1.05;deck.loop=true;deck.preservesPitch=true;
  const trace=capture.finish(receipt);
  assert.equal(trace.events.find(e=>e.action==='play').context_frame,24000);
  assert.equal(trace.events.at(-1).state.a.mode,'media');assert.equal(trace.events.at(-1).state.a.position_seconds,3);
  assert.equal(trace.events.at(-1).state.a.rate,1.05);
});
test('schema rejects mismatched recording linkage, private fields, claims and malformed states',()=>{
  const trace=fixture().capture.finish(receipt);
  for(const edit of [t=>t.training_authorized=true,t=>t.wav_sha256='b'.repeat(64),t=>t.sample_rate=NaN,
    t=>t.events[0].state.a.filename='private.wav',t=>t.events[0].state.a.position_seconds=NaN,
    t=>t.events[0].state.a.mode='unknown',t=>t.events[0].state.a.rate=4,t=>t.events[0].context_frame=-1,
    t=>t.events[0].state.prepared.a={start_frame:5,end_frame:4},t=>t.events[0].state.a.region_seconds=[2,1],
    t=>t.events[0].state.a.scratching=true,t=>t.events[0].target='elsewhere',t=>t.events[0].action='play']){
    const copy=structuredClone(trace);edit(copy);assert.throws(()=>validateMixTransport(copy,receipt));
  }
});
test('event cap, backwards clocks and failed observations discard only the trace',()=>{
  for(const kind of ['cap','clock','throw']){
    const {capture,context,getState}=fixture();
    if(kind==='cap'){for(let i=1;i<=MAX_MIX_ACTIONS;i++)capture.record('a','seek',getState,context);}
    if(kind==='clock'){context.currentTime=2;capture.record('a','seek',getState,context);context.currentTime=1;capture.record('a','seek',getState,context);}
    if(kind==='throw')capture.record('a','seek',()=>{throw Error('read failed');},context);
    assert.equal(capture.finish(receipt),null);assert.equal(capture.events.length,0);
  }
});
