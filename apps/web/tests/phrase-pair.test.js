import test from 'node:test';
import assert from 'node:assert/strict';
import { pairPhrase, validatePhrasePair, verifyPhrasePair } from '../phrase-pair.js';
import { sha256 } from '../live-take.js';

const trace = new TextEncoder().encode(JSON.stringify({
  schema_version: '1.0-live-instrument-take', scope: 'dry_instruments', origin: 'unreviewed_live_capture',
  training_authorized: false, engine_sha256: 'a'.repeat(64), wav_sha256: 'b'.repeat(64),
  sample_rate: 48000, frames: 256, initial_mouth: .5, events: [],
}));
const source = () => ({ samples: new Float32Array(96000).fill(.125), origin: 'microphone', context: null });
test('pair binds a normalized source and existing trace without inferring rights or context', async () => {
  const { pair, wav } = await pairPhrase(source(), trace);
  assert.equal(pair.training_authorized, false);
  assert.equal(pair.review, 'unreviewed');
  assert.equal(pair.context_at_start, null);
  assert.equal(pair.source.wav_sha256, await sha256(wav));
  assert.equal((await verifyPhrasePair(pair, wav, trace)).frames, 256);
  assert.equal(new DataView(wav).getInt16(44, true), 4096);
});
test('confirmed context is explicit and bounded; malformed permissions, extra identity and future formats fail', async () => {
  const c = { tempo_milli_bpm: 123456, tonic_midi: 69, mode: 'minor', beats_per_bar: 4, downbeat_seconds: .5, status: 'user_confirmed' };
  const { pair } = await pairPhrase({ ...source(), context: c }, trace);
  assert.deepEqual(pair.context_at_start, c);
  for (const edit of [
    p => p.training_authorized = true, p => p.review = 'expert', p => p.schema_version = '2',
    p => p.source.permission = 'training', p => p.source.origin = 'verified_artist',
    p => p.source.filename = 'private-name.wav', p => p.context_at_start.status = 'automatic',
    p => p.context_at_start.tempo_milli_bpm = 0, p => p.context_at_start.tonic_midi = 128,
    p => p.context_at_start.downbeat_seconds = Infinity, p => p.source.frames = 240001,
    p => p.source.sample_rate = 44100, p => p.source.channels = 2, p => p.extra = true,
  ]) {
    const bad = structuredClone(pair); edit(bad); assert.throws(() => validatePhrasePair(bad));
  }
});
test('changed source, swapped response trace and tampered WAV header are rejected', async () => {
  const { pair, wav } = await pairPhrase(source(), trace);
  const changed = wav.slice(0); new DataView(changed).setInt16(44, 100, true);
  await assert.rejects(verifyPhrasePair(pair, changed, trace), /mismatch/);
  await assert.rejects(verifyPhrasePair(pair, wav, new TextEncoder().encode('{}')), /mismatch/);
  const badHeader = wav.slice(0); new DataView(badHeader).setUint16(22, 2, true);
  await assert.rejects(verifyPhrasePair({ ...pair, source: { ...pair.source, wav_sha256: await sha256(badHeader) } }, badHeader, trace), /WAV/);
  const badTrace = new TextEncoder().encode(JSON.stringify({ events: [] }));
  await assert.rejects(verifyPhrasePair({ ...pair, take_sha256: await sha256(badTrace) }, wav, badTrace), /take/);
});
test('pairing rejects short, long and nonfinite source audio without altering the input', async () => {
  for (const samples of [new Float32Array(95999), new Float32Array(240001), new Float32Array(96000).fill(NaN)])
    await assert.rejects(pairPhrase({ ...source(), samples }, trace));
  const original = source(), before = original.samples.slice();
  await pairPhrase(original, trace); assert.deepEqual(original.samples, before);
});
