import test from 'node:test';
import assert from 'node:assert/strict';
import { compositionKey, selectFresh } from '../novelty.js';

const score = () => ({ seed: 1, ticks_per_quarter: 960, time_signature: [4, 4], target_bars: 12,
  tempo_milli_bpm: 96000, key: { tonic_midi: 60 },
  tracks: [{ instrument: 'piano', events: [{ start_tick: 7680, duration_ticks: 960, note: 60, velocity: 80 }] }] });

test('composition identity ignores cosmetic changes, ordering and transposition; detects musical changes', async () => {
  const original = score(), key = await compositionKey(original);
  const changed = score(); changed.tracks[0].instrument = 'organ'; changed.seed = 456; changed.tempo_milli_bpm = 100000;
  changed.key.tonic_midi += 3; changed.tracks[0].events[0].note += 3;
  changed.tracks[0].events[0].velocity = 100;
  changed.tracks[0].events.push({ start_tick: 0, duration_ticks: 960, note: 70, velocity: 90 });
  assert.equal(await compositionKey(changed), key);
  changed.tracks[0].events[0].start_tick += 240;
  assert.notEqual(await compositionKey(changed), key);
  original.tracks.push({ instrument: 'drums', events: [{ start_tick: 8000, duration_ticks: 240, note: 38 }] });
  const ordered = await compositionKey(original); original.tracks.reverse();
  assert.equal(await compositionKey(original), ordered);
});

test('selection retries only duplicates, records the actual seed and bounds exhaustion before publishing', async () => {
  const old = score(), recent = [await compositionKey(old)];
  const fresh = score(); fresh.tracks[0].events[0].note += 7;
  const calls = [];
  const result = await selectFresh(0xffffffff, recent, async seed => {
    calls.push(seed); return [calls.length === 1 ? old : fresh];
  });
  assert.deepEqual(result, { seed: calls[1], attempts: 2 });
  assert.notEqual(calls[0], calls[1]); assert(calls[1] >= 0 && calls[1] <= 0xffffffff);
  let attempts = 0;
  await assert.rejects(selectFresh(1, recent, async () => { attempts++; return [old]; }), /repeat a recent composition/);
  assert.equal(attempts, 8);
  await assert.rejects(selectFresh(1, ['invalid'], async () => assert.fail('rendered invalid history')), /Invalid recent/);
  await assert.rejects(selectFresh(1, Array(31).fill(recent[0]), async () => assert.fail()), /Invalid recent/);
  let first = 0;
  assert.deepEqual(await selectFresh(123, [], async () => { first++; return [old]; }), { seed: 123, attempts: 1 });
  assert.equal(first, 1);
});
