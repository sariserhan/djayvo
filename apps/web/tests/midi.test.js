import test from 'node:test';
import assert from 'node:assert/strict';
import { midiMessage, midiPickup } from '../midi.js';

test('MIDI decodes note-off forms, velocity, channel boundaries and only supported controls', () => {
  assert.deepEqual(midiMessage(new Uint8Array([0x90, 60, 127])), { type: 'note', channel: 0, note: 60, value: 127 });
  assert.deepEqual(midiMessage([0x9f, 108, 1]), { type: 'note', channel: 15, note: 108, value: 1 });
  for (const status of [0x89, 0x99]) assert.equal(midiMessage([status, 36, 0]).type, 'off');
  for (const note of [0, 1, 7, 64, 119, 120, 121, 123]) assert.deepEqual(midiMessage([0xb5, note, 64]), { type: 'control', channel: 5, note, value: 64 });
  for (const data of [null, [], [0x90, 60], [0x90, 60, 100, 0], [0x90, 128, 1], [0x90, 60, -1],
    [0x90, 60, 1.2], [0x90, 60, NaN], [0x190, 60, 1], [0xb0, 122, 0], [0xb0, 127, 0], [0xa0, 60, 127], [0xe0, 0, 64], [0xf8], [0xf0, 0, 0xf7]])
    assert.equal(midiMessage(data), null);
});


test('absolute CC pickup prevents jumps, follows crossings and rearms after screen changes', () => {
  const binding = { previous: 0, latched: false };
  assert.equal(midiPickup(binding, 10, .5, 0, 1, .01), null);
  assert.equal(midiPickup(binding, 70, .5, 0, 1, .01), .55);
  assert.equal(midiPickup(binding, 127, .55, 0, 1, .01), 1);
  assert.equal(midiPickup(binding, 120, .25, 0, 1, .01), null);
  assert.equal(midiPickup(binding, 32, .25, 0, 1, .01), .25);
  assert.equal(midiPickup(binding, 0, .25, 0, 1, .01), 0);
  assert.equal(midiPickup({}, 127, 800, 100, 800, 10), 800);
  assert.equal(midiPickup({}, 0, -12, -12, 12, 1), -12);
  assert.equal(midiPickup({}, 64, 0, -12, 12, 1), 0);
  for (const value of [NaN, Infinity, -1, 128, .5]) assert.throws(() => midiPickup({}, value, .5, 0, 1, .01));
  for (const args of [[.5, 1, 0, .01], [.5, 0, 1, 0], [2, 0, 1, .01], [NaN, 0, 1, .01]]) assert.throws(() => midiPickup({}, 50, ...args));
});
