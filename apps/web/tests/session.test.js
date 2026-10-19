import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContext } from '../session-analysis.js';
import { SessionTransport } from '../session-transport.js';

test('bounded context heuristic finds pulse and triad, and treats silence as uncertain', () => {
  const rate = 8000, samples = new Float32Array(rate * 12);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate, pulse = t % .5;
    samples[i] = (pulse < .04 ? .3 * Math.exp(-pulse * 50) * Math.sin(2 * Math.PI * 70 * t) : 0) +
      .004 * [261.626, 311.127, 391.995].reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * t), 0);
  }
  const result = analyzeContext(samples, rate);
  assert.equal(result.tempo.bpm, 120);
  assert.ok(result.tempo.confidence > .7);
  assert.equal(result.keys[0].tonic, 0); assert.equal(result.keys[0].mode, 'minor');
  const silent = analyzeContext(new Float32Array(rate * 2), rate);
  assert.equal(silent.tempo.confidence, 0); assert.equal(silent.energy, 0); assert.equal(silent.keys[0].score, 0);
  samples[120] = NaN; assert.throws(() => analyzeContext(samples, rate));
  assert.throws(() => analyzeContext(new Float32Array(1), rate));
  assert.throws(() => analyzeContext(new Float32Array(rate * 31), rate));
});

test('transport cancels future C, rejects late/short contexts and preserves A on C failure', () => {
  const sources = [];
  const parameter = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const context = { currentTime: 10, sampleRate: 48000,
    createBufferSource() { const source = { connect() {}, disconnect() {}, start(time) { this.startTime = time; }, stop(time) { this.stopTime = time; } }; sources.push(source); return source; },
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; } };
  const transport = new SessionTransport(context, (now, origin) => origin + Math.ceil((now - origin) / 96000) * 96000);
  assert.throws(() => transport.arm({ duration: 30 }, {}));
  transport.startA({ duration: 90 }, {}, 120000, .25);
  const a = transport.a;
  const frame = transport.arm({ duration: 30 }, {});
  assert.equal(frame, Math.round(10.35 * 48000));
  const c = transport.c;
  transport.stopC(); assert.ok(c.source.stopTime > 10); assert.equal(transport.a, a); assert.equal(transport.c, null);
  context.currentTime = 99;
  assert.throws(() => transport.arm({ duration: 30 }, {}), /Not enough/);
  assert.equal(transport.a, a);
  assert.throws(() => transport.play({ duration: 1 }, {}, 0, () => {}), /passed/);
  assert.throws(() => transport.startA({ duration: 90 }, {}, 120000, NaN));
  transport.stop(); assert.equal(transport.a, null);
  c.source.onended(); assert.equal(transport.c, null);
});
