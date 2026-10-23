import test from 'node:test';import assert from 'node:assert/strict';import {FrameDeck} from '../frame-deck.js';
function fixture(){const param=()=>({value:1,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});const nodes=[];
 const context={currentTime:0,sampleRate:48000,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBufferSource:()=>{const n={playbackRate:param(),connect(){},disconnect(){},start(t,offset){this.started=[t,offset];},stop(){}};nodes.push(n);return n;}};
 const media=new EventTarget();Object.assign(media,{pause(){},removeAttribute(){},load(){}});const deck=new FrameDeck(media,()=>context,()=>({}));deck.useBuffer({duration:64});return {deck,context,nodes};}
test('shared-clock playback integrates rate changes without restarting and pause preserves position',async()=>{const {deck,context,nodes}=fixture();await deck.play();context.currentTime=2;assert.equal(deck.currentTime,2);deck.playbackRate=1.1;context.currentTime=12;assert.equal(deck.currentTime,13);assert.equal(nodes.length,1);deck.pause();context.currentTime=15;assert.equal(deck.currentTime,13);await deck.play();assert.equal(nodes[1].started[1],13);});
test('beat loop wraps on the audio clock and exit continues at its actual position',async()=>{const {deck,context,nodes}=fixture();deck.currentTime=4;deck.beatLoop(8,120);await deck.play();context.currentTime=11;assert.equal(deck.currentTime,7);assert.equal(nodes[0].loopStart,4);assert.equal(nodes[0].loopEnd,8);deck.exitLoop();context.currentTime=12;assert.equal(deck.currentTime,8);assert.equal(nodes[0].loop,false);assert.throws(()=>deck.beatLoop(3,120));deck.currentTime=63;assert.throws(()=>deck.beatLoop(8,120));});
test('seek retires old voice and late ended events cannot stop the new one',async()=>{const {deck,context,nodes}=fixture();await deck.play();context.currentTime=3;deck.currentTime=8;nodes[0].onended();assert.equal(deck.paused,false);assert.equal(deck.currentTime,8);assert.throws(()=>deck.playbackRate=NaN);});
test('returning from a beat loop to whole-track repeat preserves the wrapped position and changes source bounds',async()=>{const {deck,context,nodes}=fixture();deck.currentTime=4;deck.beatLoop(8,120);await deck.play();context.currentTime=11;deck.exitLoop();deck.loop=true;assert.equal(deck.currentTime,7);assert.equal(nodes[0].loopStart,0);assert.equal(nodes[0].loopEnd,64);context.currentTime=12;assert.equal(deck.currentTime,8);});
test('roll returns to the uninterrupted timeline, integrating live rate changes',async()=>{
 const {deck,context}=fixture();assert.throws(()=>deck.startRoll(2,120),/Play/);await deck.play();context.currentTime=4;deck.startRoll(2,120);
 context.currentTime=6;assert.equal(deck.currentTime,4);deck.playbackRate=1.1;context.currentTime=8;deck.exitLoop();assert.equal(deck.currentTime,8.2);assert.equal(deck.loop,false);
 deck.startRoll(2,120);context.currentTime=9;deck.pause();assert.ok(Math.abs(deck.currentTime-9.3)<1e-9);assert.equal(deck.roll,null);assert.equal(deck.loop,false);
});
test('manual seeks override rolls and replacement cannot retain slip state',async()=>{
 const {deck,context}=fixture();await deck.play();context.currentTime=2;deck.startRoll(2,120);deck.currentTime=20;assert.equal(deck.roll,null);assert.equal(deck.loop,false);assert.equal(deck.currentTime,20);
 deck.startRoll(2,120);deck.useBuffer({duration:32});assert.equal(deck.roll,null);assert.equal(deck.currentTime,0);assert.equal(deck.paused,true);
});
test('a roll released after track end stops instead of restarting at zero',async()=>{
 const {deck,context}=fixture();deck.currentTime=60;await deck.play();deck.startRoll(2,120);context.currentTime=10;deck.exitLoop();assert.equal(deck.currentTime,64);assert.equal(deck.paused,true);assert.equal(deck.ended,true);
});
test('fractional beat loops respect grid origin and resize on the playing audio clock',async()=>{
 const {deck,context,nodes}=fixture();deck.currentTime=4.4;deck.beatLoop(.25,120,.1);assert.deepEqual(deck.region,[4.1,4.225]);
 await deck.play();context.currentTime=.05;deck.setLoopRegion(4.1,4.35);assert.equal(nodes.at(-1).loopEnd,4.35);assert.ok(deck.currentTime>=4.1&&deck.currentTime<=4.35);
 for(const region of [[-1,2],[2,2],[2,65],[NaN,4]])assert.throws(()=>deck.setLoopRegion(...region));
 assert.throws(()=>deck.beatLoop(.25,120,-1));deck.exitLoop();deck.startRoll(.125,120,.1);context.currentTime=1;deck.exitLoop();assert.equal(deck.roll,null);
});
