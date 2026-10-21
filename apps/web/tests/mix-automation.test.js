import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MIX_GAIN_TARGETS, setMixerGain, updateMixer, updateToneEcho, clearEcho, beatEchoDelay } from '../mixer.js';
import { MixAutomation, MAX_MIX_ACTIONS, validateMixAutomation } from '../mix-automation.js';

function harness() {
  const calls = [], context = { currentTime: 1, sampleRate: 48000 };
  const mixer = {
    effects: Object.fromEntries(['a', 'b', 'c', 'rack'].map(target => [target, { targets: { tone: 100, echo: 0, spacing_ms: 300 } }])),
    gainTargets: Object.fromEntries(MIX_GAIN_TARGETS.map(target => [target, 0])),
    gainParams: Object.fromEntries(MIX_GAIN_TARGETS.map(target => [target, {
      setTargetAtTime: (...args) => calls.push([target, ...args]),
    }])),
  };
  const trace = new MixAutomation(mixer, context); mixer.automationTrace = trace;
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

function effectHarness(target = 'c') {
  const h = harness(), schedules = [];
  const param = name => ({ value: 24000,
    cancelScheduledValues: time => schedules.push([name, 'cancel', time]),
    setValueAtTime: (...args) => schedules.push([name, 'set', ...args]),
    exponentialRampToValueAtTime: (...args) => schedules.push([name, 'ramp', ...args]),
    setTargetAtTime: (...args) => schedules.push([name, 'target', ...args]),
  });
  let index = 0;
  h.context.createDelay = () => ({ delayTime: param(`delay-${index++}`), connect() {}, disconnect() {} });
  const fx = h.mixer.effects[target];
  Object.assign(fx, { mixer: h.mixer, target, input: { frequency: param('frequency') },
    dry: { gain: param('dry') }, wet: { gain: param('wet') },
    send: { gain: param('send'), connect() {}, disconnect() {} }, spacing: 300,
    delays: [0, 1, 2].map(() => h.context.createDelay()), taps: [{}, {}, {}] });
  return { ...h, fx, schedules };
}

test('tone/echo and reset preserve actual schedules, fractional beat spacing and frozen initial targets', () => {
  for (const target of ['a', 'b', 'c', 'rack']) {
    const h = effectHarness(target), spacing = beatEchoDelay(127190, 'triplet');
    updateToneEcho(h.context, h.fx, 50, .4, spacing);
    assert.deepEqual(h.schedules, [
      ['frequency', 'cancel', 1], ['frequency', 'set', 24000, 1], ['frequency', 'ramp', 2000, 1.03],
      ['dry', 'target', .6, 1, .01], ['wet', 'target', .4, 1, .01],
      ...[0, 1, 2].map(i => [`delay-${i}`, 'target', spacing * (i + 1) / 1000, 1, .03]),
    ]);
    h.context.currentTime = 1.25; clearEcho(h.context, h.fx);
    assert.deepEqual(h.schedules.slice(-3), [['send', 'cancel', 1.25], ['send', 'set', 0, 1.25], ['send', 'set', 1, 1.26]]);
    assert.deepEqual(h.fx.delays.map(d => d.delayTime.value), [1, 2, 3].map(i => spacing * i / 1000));
    const trace = h.trace.finish(h.receipt);
    assert.equal(trace.schema_version, '2.0-mix-automation');
    assert.deepEqual(trace.initial_effects[target], { tone: 100, echo: 0, spacing_ms: 300 });
    assert.deepEqual(trace.events, [
      { kind: 'tone_echo', target, context_frame: 48000, tone: 50, echo: .4, spacing_ms: spacing, held_frequency_hz: 24000 },
      { kind: 'clear_echo', target, context_frame: 60000, spacing_ms: spacing },
    ]);
  }
});

test('invalid controls do not touch audio; partial effect failures invalidate trace without blocking later gains', () => {
  for (const failure of ['wet', 'delay', 'reset']) {
    const h = effectHarness();
    assert.throws(() => updateToneEcho(h.context, h.fx, NaN, .2, 300));
    assert.equal(h.schedules.length, 0); assert.equal(h.trace.invalid, false);
    setMixerGain(h.context, h.mixer, 'a', .5);
    if (failure === 'reset') {
      h.context.createDelay = () => { throw new Error('Delay failure'); };
      assert.throws(() => clearEcho(h.context, h.fx), /Delay failure/);
    } else {
      const parameter = failure === 'wet' ? h.fx.wet.gain : h.fx.delays[2].delayTime;
      parameter.setTargetAtTime = () => { throw new Error('Parameter failure'); };
      assert.throws(() => updateToneEcho(h.context, h.fx, 50, .2, 450), /Parameter failure/);
      assert.equal(h.fx.spacing, 300);
    }
    assert.ok(h.schedules.length > 0);
    assert.equal(h.trace.finish(h.receipt), null); assert.equal(h.trace.events.length, 0);
    setMixerGain(h.context, h.mixer, 'a', 0); assert.equal(h.mixer.gainTargets.a, 0);
  }
});

test('gain and effect actions share one cap; malformed effects and inconsistent reset spacing fail validation', () => {
  const h = effectHarness();
  updateToneEcho(h.context, h.fx, 25, .2, 175); clearEcho(h.context, h.fx);
  const trace = h.trace.finish(h.receipt);
  for (const change of [{ held_frequency_hz: 0 }, { held_frequency_hz: 24001 }, { spacing_ms: NaN },
    { echo: .51 }, { tone: 101 }, { target: 'eq-a-0' }, { kind: 'arbitrary_code' }, { user_name: 'private' }])
    assert.throws(() => validateMixAutomation({ ...trace, events: [{ ...trace.events[0], ...change }] }, h.receipt));
  assert.throws(() => validateMixAutomation({ ...trace, events: [trace.events[0], { ...trace.events[1], spacing_ms: 300 }] }, h.receipt));
  assert.throws(() => validateMixAutomation({ ...trace, initial_effects: { ...trace.initial_effects, c: { tone: 50, echo: 1, spacing_ms: 300 } } }, h.receipt));
  for (let i = 2; i <= MAX_MIX_ACTIONS; i++) setMixerGain(h.context, h.mixer, 'a', .5);
  assert.equal(h.trace.finish(h.receipt), null); assert.equal(h.trace.overflow, true);
  updateToneEcho(h.context, h.fx, 100, 0, 300);
  assert.equal(h.fx.targets.echo, 0); assert.equal(h.trace.events.length, 0);
});

test('retained v1 trace and receipt still validate, but new fields or event kinds cannot masquerade as v1', () => {
  const load = name => JSON.parse(fs.readFileSync(new URL(`../../../docs/evidence/r1-automation/chromium.${name}.json`, import.meta.url), 'utf8'));
  const trace = load('controls'), receipt = load('mix');
  assert.equal(validateMixAutomation(trace, receipt), trace);
  assert.throws(() => validateMixAutomation({ ...trace, initial_effects: {} }, receipt));
  assert.throws(() => validateMixAutomation({ ...trace, events: [{ ...trace.events[0], kind: 'gain' }] }, receipt));
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

test('deck space and modulation snapshots and resets retain versioned validation',()=>{
 const h=harness();h.mixer.deckEffects=Object.fromEntries(['a','b'].map(t=>[t,{targets:{reverb:0,phaser:0,flanger:0}}]));
 const trace=new MixAutomation(h.mixer,h.context);h.mixer.deckEffects.a.targets.reverb=.5;
 trace.append({kind:'deck_effects',target:'a',context_frame:48000,reverb:.3,phaser:.2,flanger:.1});trace.append({kind:'clear_deck_effects',target:'b',context_frame:48001});
 const result=trace.finish(h.receipt);assert.equal(result.schema_version,'3.0-mix-automation');assert.equal(result.initial_deck_effects.a.reverb,0);
 for(const value of [NaN,Infinity,-.01,.51]){const invalid=structuredClone(result);invalid.events[0].reverb=value;assert.throws(()=>validateMixAutomation(invalid,h.receipt));}
 const invalid=structuredClone(result);invalid.events[0].target='rack';assert.throws(()=>validateMixAutomation(invalid,h.receipt));
});
