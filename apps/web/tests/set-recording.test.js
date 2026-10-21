import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
function fixture(){
 const nodes=new Map(),timers=new Map(),messages=[];let now=0,next=0,meter,recorder;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:true,pause(){},load(){},removeAttribute(){},addEventListener(){}});return nodes.get(id);};
 const scope={document:{getElementById:node,addEventListener(){}},window:{addEventListener(){}},setTimeout(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id;},clearTimeout(id){timers.delete(id);},resumeAudio:async()=>{},URL,Blob,
  AudioWorkletNode:class{constructor(){meter=this;this.port={postMessage:m=>messages.push(m),close(){}};}connect(){}disconnect(){}},
  MediaRecorder:class{static isTypeSupported(){return true;}constructor(){recorder=this;this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';}}
 };
 scope.window.MediaRecorder=scope.MediaRecorder;
 const source=fs.readFileSync(new URL('../set-recording.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
 vm.runInNewContext(source+'\nglobalThis.attach=attachSetRecording;',scope);
 const context={audioWorklet:{addModule:async()=>{}},createMediaStreamDestination:()=>({stream:{getTracks:()=>[]}}),createGain:()=>({gain:{},connect(){},disconnect(){}})};
 scope.attach({graph(){},context:()=>context,mixer:()=>({meter:{connect(){},disconnect(){}}}),emit(){}});
 return {async start(){await node('set-record-start').onclick();meter.port.onmessage({data:{type:'ready'}});},advance(seconds){now+=seconds*1000;for(const [id,t]of timers)if(t.at<=now){timers.delete(id);t.fn();}},sample(seconds){meter.port.onmessage({data:{type:'meter',frames:seconds*48000,rate:48000}});},get state(){return recorder.state;},messages};
}
test('one-hour cap follows captured frames despite a short wall-clock delay',async()=>{
 const h=fixture();await h.start();h.advance(3602);h.sample(3594);assert.equal(h.state,'recording');
 h.advance(6);h.sample(3600);assert.equal(h.state,'inactive');assert.equal(h.messages.at(-1).type,'stop');
});
test('wall-clock safety deadline still stops a stalled recorder',async()=>{
 const h=fixture();await h.start();h.advance(3660);assert.equal(h.state,'inactive');assert.equal(h.messages.at(-1).type,'stop');
});
