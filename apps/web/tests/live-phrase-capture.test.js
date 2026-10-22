import test from 'node:test';import assert from 'node:assert/strict';import {livePhraseCapture} from '../live-phrase-capture.js';
test('capture cancels late permission/module startup and closes on interruption',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),Worklet=globalThis.AudioWorkletNode;
 const devices=new EventTarget(),track=new EventTarget();track.readyState='live';track.enabled=true;track.stop=()=>track.readyState='ended';const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 const context=new EventTarget();Object.assign(context,{state:'running',sampleRate:48000,destination:{},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),createMediaStreamSource:()=>({connect(){},disconnect(){}}),audioWorklet:{addModule:async()=>{}}});
 const nodes=[];globalThis.AudioWorkletNode=class{constructor(){this.port={close(){},postMessage(){}};nodes.push(this);}connect(){}disconnect(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:devices}});
 try{
  let resolve;devices.getUserMedia=()=>new Promise(r=>resolve=r);let controller=new AbortController();const pending=livePhraseCapture(context,controller.signal,()=>{},()=>{});controller.abort();resolve(stream);await assert.rejects(pending,/cancelled/);assert.equal(track.readyState,'ended');assert.equal(nodes.length,0);
  track.readyState='live';devices.getUserMedia=async()=>stream;let loading;context.audioWorklet.addModule=()=>new Promise(r=>loading=r);controller=new AbortController();const errors=[];const changed=livePhraseCapture(context,controller.signal,()=>{},e=>errors.push(e));await Promise.resolve();devices.dispatchEvent(new Event('devicechange'));loading();await assert.rejects(changed,/cancelled/);assert.equal(track.readyState,'ended');assert.equal(nodes.length,0);assert.match(errors[0].message,/devices changed/);
  track.readyState='live';context.audioWorklet.addModule=async()=>{};controller=new AbortController();const active=await livePhraseCapture(context,controller.signal,()=>{},e=>errors.push(e));active.listen();assert.equal(track.enabled,true);context.state='suspended';context.dispatchEvent(new Event('statechange'));assert.equal(track.readyState,'ended');assert.match(errors.at(-1).message,/interrupted/);track.enabled=false;active.listen();assert.equal(track.enabled,false);controller.abort();
 }finally{if(saved)Object.defineProperty(globalThis,'navigator',saved);else delete globalThis.navigator;if(Worklet)globalThis.AudioWorkletNode=Worklet;else delete globalThis.AudioWorkletNode;}
});
