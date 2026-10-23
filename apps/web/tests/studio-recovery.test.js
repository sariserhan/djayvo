import test from 'node:test';import assert from 'node:assert/strict';import {validateRecovery} from '../studio-recovery.js';
const fixture=()=>({version:1,curve:'linear',values:{crossfade:.5,master:.5,...Object.fromEntries(['a','b'].flatMap(d=>[
 [`level-${d}`,.5],[`tone-${d}`,100],[`echo-${d}`,0],[`delay-${d}`,300],...[0,1,2].map(b=>[`eq-${d}-${b}`,0])]))},
 decks:[{sha:'a'.repeat(64),duration:60,position:7,rate:1.1,buffered:true,loop:false,keylock:false,bpm:'120',cue:2,hot:[null,3,8,null],region:[4,8]},null]});
test('recovery accepts bounded paused-set state and rejects damaged or unsafe controls',()=>{
 assert.equal(validateRecovery(fixture()).decks[0].position,7);
 for(const change of [{position:61},{rate:NaN},{cue:-1},{hot:[null,3,Infinity,null]},{region:[8,4]},{region:[4,61]},{buffered:false},{sha:'bad'},{bpm:'999'},{loop:'true'}]){
  const state=fixture();Object.assign(state.decks[0],change);assert.throws(()=>validateRecovery(state));
 }
 for(const change of [{version:2},{curve:'unknown'},{decks:[]},{values:{master:100}}])assert.throws(()=>validateRecovery({...fixture(),...change}));
});
test('full scenes validate rack register, effects and source/performance bounds',()=>{
 const state={...fixture(),version:2,root:36,echoGrid:'manual'};
 Object.assign(state.values,{'rack-level':.5,'rack-tone':100,'rack-echo':0,'rack-delay':300,patch:11,velocity:90,mouth:.7,'c-level':.5,'tone-c':100,'echo-c':0,'delay-c':300,...Object.fromEntries(['a','b'].flatMap(d=>['reverb','phaser','flanger'].map(f=>[`${f}-${d}`,.2])))});
 state.performance={prepared:true,confirmed:true,context:{tempo:110000,tonic:60,mode:'minor'},downbeat:0,phrase:new ArrayBuffer(44),phraseSha:'b'.repeat(64),performance:null};
 assert.equal(validateRecovery(state).root,36);
 for(const root of [23,25,97,NaN])assert.throws(()=>validateRecovery({...state,root}));
 for(const change of [{phrase:new ArrayBuffer(480045)},{phraseSha:'wrong'},{context:{tempo:110,tonic:60,mode:'minor'}},{performance:{files:[{bytes:new ArrayBuffer(1)}]}}])assert.throws(()=>validateRecovery({...state,performance:{...state.performance,...change}}));
});
test('Pro eight-cue scenes retain manual grids and legacy scenes remain valid',()=>{
 const state=fixture();Object.assign(state.decks[0],{hot:[1,2,3,4,5,6,7,8],gridOrigin:.12,quantize:true,echoDivision:'0.5'});assert.equal(validateRecovery(state).decks[0].hot[7],8);
 assert.equal(validateRecovery(fixture()).decks[0].hot.length,4);
 for(const change of [{hot:Array(7).fill(null)},{gridOrigin:61},{gridOrigin:NaN},{quantize:1},{echoDivision:'unknown'}]){const copy=structuredClone(state);Object.assign(copy.decks[0],change);assert.throws(()=>validateRecovery(copy));}
});
