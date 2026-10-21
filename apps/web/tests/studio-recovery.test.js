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
