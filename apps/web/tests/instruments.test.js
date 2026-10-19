import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playable, noteName, PATCHES, DRUMS, PERCUSSION } from '../instrument-rack.js';
import { tempoRate } from '../deck-controls.js';
test('instrument map covers full piano and respects guitar bank limits', () => {
  assert.equal(PATCHES.length, 10); assert.equal(DRUMS.length, 4); assert.deepEqual(PERCUSSION.map(x => x[1]), [39,37,41,70]);
  for (let note = 21; note <= 108; note++) assert.equal(playable(0, note), true);
  for (const note of [20, 109, NaN, 60.5]) assert.equal(playable(0, note), false);
  assert.equal(playable(4, 39), false); assert.equal(playable(5, 80), false);
  assert.equal(playable(4, 40), true); assert.equal(playable(5, 79), true);
  assert.equal(noteName(21), 'A0'); assert.equal(noteName(108), 'C8');
});
test('tempo match uses other deck effective tempo and rejects impossible matches', () => {
  assert.equal(tempoRate(100, 110, 1), 1.1);
  assert.equal(tempoRate(120, 120, .9), .9);
  for (const args of [[0,120,1], [120,NaN,1], [120,120,Infinity], [100,140,1], [140,100,1]]) assert.throws(() => tempoRate(...args));
});
