import test from 'node:test';
import assert from 'node:assert/strict';
import {studioMode} from '../studio-access.js';
test('unpaid and failed access checks default to sample demo; only verified Pro unlocks personal music',()=>{
 for(const hash of ['', '#pro', '#decks', '#performance']) {
  assert.equal(studioMode(false,hash),'demo');assert.equal(studioMode(true,hash),'pro');
 }
 for(const paid of [false,true]) {
  assert.equal(studioMode(paid,'#basic'),'basic');assert.equal(studioMode(paid,'#pro-demo'),'demo');
 }
});
