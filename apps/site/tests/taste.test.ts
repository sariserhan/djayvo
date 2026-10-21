import test from 'node:test';import assert from 'node:assert/strict';
import {emptyTaste,validateTaste,tasteBrief,tasteRender} from '../lib/taste';
test('taste derives explicit dimensions, never audio attributes from titles',()=>{
 const p=validateTaste({...emptyTaste,references:['Any artist — Any song']});const brief=tasteBrief(p);
 assert.equal(brief.tempo_bpm,110);assert.equal(brief.origin,'explicit_user_preferences');assert.equal(brief.audio_generated,false);
 assert.equal(brief.proposals.length,3);assert.equal(new Set(brief.proposals.map(p=>p.focus)).size,3);
 assert.ok(brief.unknown.includes('reference melody'));assert.equal(brief.training_opt_in,false);
 for(const patch of [{tempo:0},{novelty:101},{instruments:['unknown']},{energy:'loud'},{references:['x'.repeat(161)]},{version:2},{instruments:[]}])assert.throws(()=>validateTaste({...p,...patch}));
});
test('local composer receives only explicit musical dimensions and bounded requests',()=>{
 const p={...emptyTaste,references:['Private song note'],instruments:['piano','bass','drums','voice']};
 assert.deepEqual(tasteRender(p,42,60,1),{seed:42,tempo:110,energy:1,instruments:13,novelty:50,seconds:60,direction:1});
 assert.throws(()=>tasteRender({...p,instruments:['voice']},42,30,0),/recording/);
 for(const args of [[-1,30,0],[1,181,0],[1,30,3],[NaN,30,0],[1,29,0]])assert.throws(()=>tasteRender(p,args[0],args[1],args[2]));
});
