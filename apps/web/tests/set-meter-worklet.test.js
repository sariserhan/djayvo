import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function fixture(){
 const messages=[];let Meter;
 const scope={currentFrame:0,sampleRate:48000,AudioWorkletProcessor:class{constructor(){this.port={postMessage:data=>messages.push(data)};}},registerProcessor(name,type){Meter=type;}};
 vm.runInNewContext(readFileSync(new URL('../set-meter-worklet.js',import.meta.url),'utf8'),scope);
 const meter=new Meter(),input=new Float32Array(128).fill(.25),output=[new Float32Array(128),new Float32Array(128)];
 return {feed(frame){scope.currentFrame=frame;meter.process([[input,input]],[output]);},stop(){meter.port.onmessage({data:{type:'stop'}});return messages.at(-1);},meter,messages};
}
function warm(h){for(const frame of [0,128,256,384])h.feed(frame);}

test('a single stale timestamp followed by exact catch-up retains all measured blocks',()=>{
 const h=fixture();warm(h);h.feed(384);h.feed(640);h.feed(768);
 const receipt=h.stop();assert.equal(receipt.frames,5*128);assert.equal(receipt.gaps,0);assert.equal(receipt.clockStalls,1);
 const reading=h.messages.find(m=>m.type==='meter');assert.equal(reading.peak,.25);assert.equal(reading.rms,.25);
});
test('contiguous blocks have no stalls or gaps',()=>{
 const h=fixture();warm(h);h.feed(512);h.feed(640);const r=h.stop();assert.equal(r.frames,4*128);assert.equal(r.gaps,0);assert.equal(r.clockStalls,0);
});
test('missing, backward, repeated-stale and unconfirmed final frames remain gaps',()=>{
 for(const frames of [[640],[256],[384,384,768],[384],[384,768]]){
  const h=fixture();warm(h);for(const frame of frames)h.feed(frame);const r=h.stop();assert.ok(r.gaps>0,JSON.stringify(frames));assert.equal(r.clockStalls,0);
 }
});
