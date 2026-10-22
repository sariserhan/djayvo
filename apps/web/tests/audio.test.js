import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, trimFrames, RATE } from '../audio.js';

test('decimal selections preserve the exact two-second boundary', () => {
  assert.deepEqual(trimFrames(5 * RATE, 0.23, 2.23), [11040, 96000]);
  assert.deepEqual(trimFrames(5 * RATE, 0, 5), [0, 240000]);
  for (const [start, end] of [[0, 1.99], [0, 5.01], [-1, 2], [4, 6], [NaN, 3]])
    assert.throws(() => trimFrames(5 * RATE, start, end));
});

test('WAV is bounded PCM16 mono with finite samples and safe clipping', () => {
  const samples = new Float32Array(3 * RATE);
  samples.set([-2, 0, 2]);
  const wav = new DataView(encodeWav(samples));
  assert.equal(wav.byteLength, 44 + 3 * RATE * 2);
  assert.equal(wav.getUint32(24, true), RATE);
  assert.equal(wav.getUint16(22, true), 1);
  assert.equal(wav.getInt16(44, true), -32767);
  assert.equal(wav.getInt16(48, true), 32767);
  samples[0] = NaN;
  assert.throws(() => encodeWav(samples), /invalid audio/);
});

test('custom selection permits 1–15 seconds without relaxing the original helper default',()=>{
 assert.deepEqual(trimFrames(48000*15,0,1,48000,true),[0,48000]);assert.deepEqual(trimFrames(48000*15,0,15,48000,true),[0,720000]);
 assert.throws(()=>trimFrames(48000*15,0,1));assert.throws(()=>trimFrames(48000*15,0,15));
 for(const end of [.99,15.01])assert.throws(()=>trimFrames(48000*16,0,end,48000,true));
 assert.equal(encodeWav(new Float32Array(48000),0,1,true).byteLength,96044);
});
