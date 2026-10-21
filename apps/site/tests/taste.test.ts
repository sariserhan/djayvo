import test from 'node:test';import assert from 'node:assert/strict';
import {emptyTaste,validateTaste,tasteBrief} from '../lib/taste';
test('taste derives explicit dimensions, never audio attributes from titles',()=>{
 const p=validateTaste({...emptyTaste,references:['Any artist — Any song']});const brief=tasteBrief(p);
 assert.equal(brief.tempo_bpm,110);assert.equal(brief.origin,'explicit_user_preferences');assert.equal(brief.audio_generated,false);
 assert.equal(brief.proposals.length,3);assert.equal(new Set(brief.proposals.map(p=>p.focus)).size,3);
 assert.ok(brief.unknown.includes('reference melody'));assert.equal(brief.training_opt_in,false);
 for(const patch of [{tempo:0},{novelty:101},{instruments:['unknown']},{energy:'loud'},{references:['x'.repeat(161)]},{version:2},{instruments:[]}])assert.throws(()=>validateTaste({...p,...patch}));
});
