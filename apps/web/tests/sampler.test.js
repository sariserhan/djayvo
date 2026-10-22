import test from 'node:test';
import assert from 'node:assert/strict';
import {validSampleSettings,trimSample} from '../sampler.js';
test('sample trims, pitch and levels remain bounded',()=>{
 const s={start:0,end:4,level:.8,pitch:0,loop:false};assert.ok(validSampleSettings(s,4));
 for(const delta of [{start:-1},{end:5},{start:4},{pitch:13},{pitch:.5},{level:NaN},{loop:1}])assert.equal(validSampleSettings({...s,...delta},4),false);
 assert.equal(validSampleSettings(s,100),false);
});
test('trimmed sample keeps its duration and source, with silent loop/one-shot boundaries',()=>{
 const source=Float32Array.from({length:4800},()=>.7),buffer={sampleRate:48000,length:4800,numberOfChannels:1,getChannelData:()=>source};
 const context={createBuffer:(_channels,length)=>{const samples=new Float32Array(length);return {length,getChannelData:()=>samples};}};
 const result=trimSample(context,buffer,.02,.08),audio=result.getChannelData(0);
 assert.equal(result.length,2880);assert.equal(audio[0],0);assert.equal(audio.at(-1),0);assert.equal(audio[1000],source[1000]);assert.ok(source.every(value=>value===source[0]));
 assert.throws(()=>trimSample(context,buffer,-1,.1));
});
