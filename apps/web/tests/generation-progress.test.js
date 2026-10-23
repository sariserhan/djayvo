import test from 'node:test';
import assert from 'node:assert/strict';
import {generationProgress} from '../generation-progress.js';

test('queue and terminal states override stale phases; errors never masquerade as ready',()=>{
 assert.equal(generationProgress('queued','saving').key,'queued');
 assert.match(generationProgress('queued').detail,/waiting to be processed/);
 for(const state of ['completed','failed','cancelled','rejected']){
  const view=generationProgress(state,'composing');
  assert.equal(view.key,state);assert.equal(view.active,false);
  assert.equal(view.step,state==='completed'?3:-1);
 }
 assert.equal(generationProgress('reconnecting','saving').step,-1);
 assert.equal(generationProgress('running','checking').step,2);
 assert.equal(generationProgress('running','retrying').step,1);
 assert.equal(generationProgress('running','GPU private diagnostics').key,'composing');
 assert.equal(generationProgress('constructor','__proto__').key,'composing');
});
