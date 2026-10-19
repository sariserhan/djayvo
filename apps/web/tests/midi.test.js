import test from 'node:test';
import assert from 'node:assert/strict';
import { midiMessage } from '../midi.js';

test('MIDI decodes note-off forms, velocity, channel boundaries and only supported controls', () => {
  assert.deepEqual(midiMessage(new Uint8Array([0x90, 60, 127])), { type: 'note', channel: 0, note: 60, value: 127 });
  assert.deepEqual(midiMessage([0x9f, 108, 1]), { type: 'note', channel: 15, note: 108, value: 1 });
  for (const status of [0x89, 0x99]) assert.equal(midiMessage([status, 36, 0]).type, 'off');
  for (const note of [64, 120, 121, 123]) assert.deepEqual(midiMessage([0xb5, note, 64]), { type: 'control', channel: 5, note, value: 64 });
  for (const data of [null, [], [0x90, 60], [0x90, 60, 100, 0], [0x90, 128, 1], [0x90, 60, -1],
    [0x90, 60, 1.2], [0x90, 60, NaN], [0x190, 60, 1], [0xb0, 1, 127], [0xa0, 60, 127], [0xe0, 0, 64], [0xf8], [0xf0, 0, 0xf7]])
    assert.equal(midiMessage(data), null);
});
