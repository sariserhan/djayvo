import test from 'node:test';import assert from 'node:assert/strict';import {PhraseWindow} from '../phrase-window.js';
test('phrase endpoint ignores silence, bounds continuous input and waits for a trailing pause',()=>{
 for(const rate of [8000,44100,48000,96000]){
  const capture=new PhraseWindow(rate);assert.equal(capture.push(new Float32Array(rate*6)),0);assert.equal(capture.count,0);
  assert.equal(capture.push(new Float32Array(rate).fill(.1)),0);assert.equal(capture.push(new Float32Array(rate)),rate*2);assert.equal(capture.push(new Float32Array(rate)),0);assert.equal(capture.count,rate*2);
  const continuous=new PhraseWindow(rate);assert.equal(continuous.push(new Float32Array(rate*6).fill(.1)),rate*5);assert.equal(continuous.count,rate*5);
 }
});
test('endpoint is callback-size independent and rejects invalid buffers',()=>{
 const samples=new Float32Array(24000);for(let i=0;i<16000;i++)samples[i]=.1;
 for(const size of [1,113,128,512]){const c=new PhraseWindow(8000);for(let i=0;i<samples.length;i+=size)c.push(samples.subarray(i,i+size));assert.equal(c.count,20000);assert.ok(c.done);assert.equal(c.buffer[15999],samples[15999]);}
 assert.throws(()=>new PhraseWindow(0));assert.throws(()=>new PhraseWindow(48000,new Float32Array(1)));
 const c=new PhraseWindow(8000);c.push(new Float32Array([NaN,Infinity,.2]));assert.equal(c.count,1);
});

test('worklet transfers one bounded phrase, waits for returned storage and never monitors input',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');let Processor;const messages=[];
 const code=(await readFile(new URL('../phrase-worklet.js',import.meta.url),'utf8')).replace("import {PhraseWindow} from './phrase-window.js';",'');
 runInNewContext(code,{PhraseWindow,ArrayBuffer,Float32Array,sampleRate:8000,AudioWorkletProcessor:class{constructor(){this.port={postMessage:(data,transfer)=>messages.push(structuredClone(data,{transfer}))};}},registerProcessor:(_,p)=>Processor=p});
 const node=new Processor(),input=[[new Float32Array(128).fill(.1)]],output=[[new Float32Array(128)]];
 node.process(input,output);assert.equal(messages.length,0);
 for(let pass=0;pass<2;pass++){
  const buffer=pass?messages[0].buffer:new ArrayBuffer(8000*5*4);node.port.onmessage({data:buffer});
  for(let i=0;i<400;i++)node.process(input,output);
  assert.equal(messages.length,pass+1);assert.equal(messages[pass].frames,40000);assert.equal(buffer.byteLength,0);assert.equal(node.capture,null);assert.ok(output[0][0].every(v=>v===0));
 }
 node.port.onmessage({data:'stop'});node.port.onmessage({data:new ArrayBuffer(8000*5*4)});assert.equal(node.process(input,output),false);assert.equal(node.capture,null);assert.equal(messages.length,2);
});
