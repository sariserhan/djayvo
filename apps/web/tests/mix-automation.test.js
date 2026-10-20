import test from 'node:test';
import assert from 'node:assert/strict';
import { MIX_GAIN_TARGETS, setMixerGain, updateMixer } from '../mixer.js';
import { MixAutomation, MAX_MIX_ACTIONS, validateMixAutomation } from '../mix-automation.js';

function harness() {
  const calls = [], context = { currentTime: 1, sampleRate: 48000 };
  const mixer = {
    gainTargets: Object.fromEntries(MIX_GAIN_TARGETS.map(target => [target, 0])),
    gainParams: Object.fromEntries(MIX_GAIN_TARGETS.map(target => [target, {
      setTargetAtTime: (...args) => calls.push([target, ...args]),
    }])),
  };
  const trace = new MixAutomation(mixer, context); mixer.gainTrace = trace;
  const receipt = { wav_sha256: 'a'.repeat(64), sample_rate: 48000, observed_context_start_frame: 48128 };
  return { mixer, context, trace, calls, receipt };
}

test('all gain/EQ scheduling paths retain exact target, time and smoothing; snapshot is immutable', () => {
  const h = harness();
  updateMixer(h.context, h.mixer, .25, [.8, .6], .75);
  h.context.currentTime = 1.25;
  for (const target of MIX_GAIN_TARGETS.slice(2)) setMixerGain(h.context, h.mixer, target, target.startsWith('eq-') ? -6 : .5);
  const trace = h.trace.finish(h.receipt);
  assert.equal(trace.events.length, 10);
  assert.ok(Object.values(trace.initial_targets).every(value => value === 0));
  assert.deepEqual(trace.events.map(e => [e.target, e.value, e.context_frame / 48000, .005]), h.calls);
  assert.equal(trace.events[0].context_frame - trace.observed_context_start_frame, -128);
  assert.equal(trace.events.at(-1).context_frame - trace.observed_context_start_frame, 11872);
});

test('invalid controls and failed AudioParam scheduling never enter the accepted trace', () => {
  const h = harness();
  for (const [target, value] of [['a', NaN], ['a', 1.01], ['rack', -1], ['eq-a-0', 13], ['toString', 1]])
    assert.throws(() => setMixerGain(h.context, h.mixer, target, value));
  h.mixer.gainParams.a.setTargetAtTime = () => { throw new Error('Audio failure'); };
  assert.throws(() => setMixerGain(h.context, h.mixer, 'a', .5), /Audio failure/);
  assert.equal(h.trace.events.length, 0); assert.equal(h.calls.length, 0); assert.equal(h.mixer.gainTargets.a, 0);
});

test('overflow discards the trace without interrupting scheduled audio or exposing a partial trace', () => {
  const h = harness();
  for (let i = 0; i <= MAX_MIX_ACTIONS; i++) setMixerGain(h.context, h.mixer, 'a', .5);
  assert.equal(h.trace.finish(h.receipt), null); assert.equal(h.trace.events.length, 0);
  setMixerGain(h.context, h.mixer, 'a', 0);
  assert.equal(h.calls.length, MAX_MIX_ACTIONS + 2); assert.equal(h.mixer.gainTargets.a, 0);
});

test('trace validation rejects changed linkage, extra fields, unsafe times, reordered or invalid events', () => {
  const h = harness(); setMixerGain(h.context, h.mixer, 'a', .5);
  const trace = h.trace.finish(h.receipt);
  for (const change of [{ training_authorized: true }, { scope: 'full_replay' }, { private_filename: 'voice.wav' },
    { wav_sha256: 'b'.repeat(64) }, { sample_rate: 44100 }, { observed_context_start_frame: 2 },
    { initial_targets: { a: 0 } }, { snapshot_context_frame: -1 }, { events: Array(MAX_MIX_ACTIONS + 1).fill(trace.events[0]) }])
    assert.throws(() => validateMixAutomation({ ...trace, ...change }, h.receipt));
  for (const change of [{ context_frame: 47999 }, { context_frame: Infinity }, { target: 'constructor' },
    { value: '0.5' }, { received_time: 1 }])
    assert.throws(() => validateMixAutomation({ ...trace, events: [{ ...trace.events[0], ...change }] }, h.receipt));
  assert.throws(() => validateMixAutomation({ ...trace, events: [
    { ...trace.events[0], context_frame: 50000 }, trace.events[0],
  ] }, h.receipt));
});
