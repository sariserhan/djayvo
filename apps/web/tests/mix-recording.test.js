import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TAKE_SECONDS, stereoWav, sha256 } from '../live-take.js';
import { validateMixRecording } from '../mix-recording.js';

function harness(rate = 48000) {
  let Processor; const messages = [];
  const scope = { TAKE_SECONDS, sampleRate: rate, currentFrame: 4096,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (data, transfer = []) =>
      messages.push(structuredClone(data, { transfer })) }; } },
    registerProcessor: (_, cls) => { Processor = cls; } };
  vm.runInNewContext(fs.readFileSync(new URL('../mix-recording-worklet.js', import.meta.url), 'utf8').replace(/^import .*;\n/, ''), scope);
  const processor = new Processor(), output = [[new Float32Array(128), new Float32Array(128)]];
  return { scope, processor, messages, output, send: type => processor.port.onmessage({ data: { type } }),
    block: input => { const result = processor.process([input], output); scope.currentFrame += 128; return result; } };
}

test('mix capture preserves independent stereo channels, records frame count and emits only silence', () => {
  const h = harness(), left = new Float32Array(128).fill(.25), right = new Float32Array(128).fill(-.125);
  h.block([left, right]); h.block([left, right]); h.send('stop');
  const done = h.messages.at(-1);
  assert.equal(done.frames, 256); assert.equal(done.first, 4096); assert.equal(done.discontinuities, 0);
  for (let i = 0; i < 512; i++) assert.equal(done.samples[i], i % 2 ? -.125 : .25);
  assert.ok(h.output[0].every(channel => channel.every(x => x === 0)));
  assert.equal(h.block([left, right]), false);
  h.send('stop'); assert.equal(h.messages.length, 2);
});
test('empty/mono inputs preserve clock and stale timestamps remain diagnostics, not fabricated loss', () => {
  const h = harness(); h.block([]); h.scope.currentFrame = 1;
  h.block([new Float32Array(128).fill(.125)]); h.send('stop');
  const done = h.messages.at(-1); assert.equal(done.frames, 256); assert.equal(done.discontinuities, 1);
  assert.ok(done.samples.slice(0, 256).every(x => x === 0));
  assert.ok(done.samples.slice(256, 512).every(x => x === .125));
});
test('30-second cap is enforced on the audio thread even without a main-thread stop', () => {
  for (const rate of [44100, 48000]) {
    const h = harness(rate), input = [new Float32Array(128).fill(.1)];
    for (let i = 0; i < 12000; i++) h.block(input);
    assert.equal(h.processor.frames, rate * 30); assert.equal(h.processor.pcm.length, rate * 30 * 2);
    assert.equal(h.messages.length, 1); h.send('stop');
    assert.equal(h.messages.at(-1).capped, true);
  }
});
test('cancel releases the buffer and produces no recording; unsupported rates fail before allocation', () => {
  const h = harness(); h.block([]); h.send('cancel'); h.send('stop');
  assert.equal(h.processor.pcm, null); assert.equal(h.messages.length, 2);
  assert.equal(h.messages.at(-1).type, 'cancelled'); assert.equal(h.block([]), false);
  for (const rate of [NaN, 8000, 192001]) assert.throws(() => harness(rate), /rate/);
});
test('receipt stays private, bounded and explicitly distinct from a replayable musical plan', async () => {
  const h = harness(); h.block([new Float32Array(128).fill(.1)]); h.send('stop');
  const done = h.messages.at(-1), wav = stereoWav(done.samples, done.frames, done.rate);
  const receipt = { schema_version: '1.0-mix-recording', scope: 'post_limiter_studio_mix', origin: 'unreviewed_live_capture',
    training_authorized: false, permission: 'user_attested_private_mix', sample_rate: done.rate, frames: done.frames,
    wav_sha256: await sha256(wav), observed_context_start_frame: done.first, timestamp_discontinuities: 0, limit_reached: false };
  validateMixRecording(receipt);
  for (const change of [{ training_authorized: true }, { frames: 0 }, { frames: 1440001 }, { permission: 'training' },
    { source_name: 'private.wav' }, { observed_context_start_frame: -1 }, { timestamp_discontinuities: NaN },
    { limit_reached: true }, { sample_rate: 22050 }, { wav_sha256: 'not a hash' }, { scope: 'dry_instruments' }])
    assert.throws(() => validateMixRecording({ ...receipt, ...change }));
  assert.throws(() => stereoWav(new Float32Array([NaN, 0]), 1, 48000));
});
