import test from 'node:test';import assert from 'node:assert/strict';import {distinctOutputs} from '../cue-routing.js';
test('cue routing rejects aliases, same device and absent output identities',()=>{
 assert.equal(distinctOutputs('speakers-1','headphones-2'),true);
 for(const pair of [['same','same'],['default','headphones'],['speakers','communications'],['','headphones'],[null,'headphones']])assert.equal(!!distinctOutputs(...pair),false);
});
test('cue stays muted until verification and interrupts pending output setup',async()=>{
 const {attachCueRouting}=await import('../cue-routing.js');
 const elements=new Map(),events=new Map(),mediaEvents=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{checked:false,disabled:false,value:id==='cue-level'?'0.8':'',textContent:'',addEventListener:(type,fn)=>events.set(id+type,fn),replaceChildren(){}});return elements.get(id);};
 const node=()=>({gain:{value:0,setTargetAtTime(v){this.value=v;}},connect(){},disconnect(){}});
 const created=[],ctx={sinkId:'original',currentTime:0,setSinkId:async id=>{ctx.sinkId=id;},createGain:()=>{const n=node();created.push(n);return n;},createWaveShaper:node,createMediaStreamDestination:()=>({...node(),stream:{getTracks:()=>[{stop(){}}]}}),resume:async()=>{}};
 let pendingPlay,releasePlay;
 class Audio{static prototypeSupported=true;paused=true;async setSinkId(id){this.sinkId=id;}async play(){this.paused=false;if(pendingPlay)await new Promise(resolve=>releasePlay=resolve);}pause(){this.paused=true;}}
 const old={};for(const key of ['document','window','navigator','Audio','HTMLMediaElement','Option'])old[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 Object.defineProperties(globalThis,{document:{configurable:true,value:{getElementById:element,addEventListener:(type,fn)=>events.set(type,fn)}},window:{configurable:true,value:{AudioContext:class {async setSinkId(){}},addEventListener(){}}},navigator:{configurable:true,value:{mediaDevices:{addEventListener:(type,fn)=>mediaEvents.set(type,fn),enumerateDevices:async()=>[]}}},Audio:{configurable:true,value:Audio},HTMLMediaElement:{configurable:true,value:Audio},Option:{configurable:true,value:class{}}});
 try{
 const rights=element('rights');rights.checked=true;
 attachCueRouting({graph(){},context:()=>ctx,mixer:()=>({strips:[{scope:node()},{scope:node()}]}),rights,paused:()=>true});
 element('cue-master-device').value='speakers';element('cue-headphone-device').value='headphones';
 await element('cue-connect').onclick();assert.equal(ctx.sinkId,'speakers');assert.ok(created.every(n=>n.gain.value===0));
 element('cue-verified').checked=true;element('cue-verified').onchange();element('cue-listen-a').checked=true;element('cue-listen-a').onchange();assert.equal(created[0].gain.value,.2);assert.equal(created[1].gain.value,0);
 mediaEvents.get('devicechange')();assert.equal(created[0].gain.value,0);assert.equal(element('cue-listen-a').disabled,true);
 await element('cue-disconnect').onclick();assert.equal(ctx.sinkId,'original');
 pendingPlay=true;const setup=element('cue-connect').onclick();while(!releasePlay)await new Promise(resolve=>setImmediate(resolve));rights.checked=false;events.get('rightschange')();releasePlay();await setup;
 assert.equal(element('cue-verified').checked,false);assert.equal(element('cue-listen-a').disabled,true);assert.equal(ctx.sinkId,'original');assert.match(element('cue-status').textContent,/interrupted/);
 }finally{for(const [key,descriptor] of Object.entries(old))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
