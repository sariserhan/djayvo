import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContext } from '../session-analysis.js';
import { SessionTransport } from '../session-transport.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('continuity diagnostic counts frame gaps, bounds its trace and resets the measurement window', () => {
  let Probe;
  const sandbox = { AudioWorkletProcessor: class { constructor() { this.port = { postMessage(data) { this.report = data; } }; } },
    currentFrame: 0, sampleRate: 48000, registerProcessor(name, processor) { Probe = processor; } };
  runInNewContext(readFileSync(new URL('./session-probe.js', import.meta.url), 'utf8'), sandbox);
  const probe = new Probe(), input = [[new Float32Array(128).fill(.1)]];
  probe.port.onmessage({ data: 'start' });
  for (let i = 0; i < 20; i++) { sandbox.currentFrame = i * 256; probe.process(input); }
  probe.port.onmessage({ data: 'report' });
  const report = probe.port.report;
  assert.equal(report.blocks, 20); assert.equal(report.frameGaps, 19); assert.equal(report.silent, 0);
  assert.equal(report.events.length, 16); assert.equal(report.events[0].delta, 128);
  assert.equal(report.events[0].frame, 256); assert.equal(report.events[0].expected, 128);
  probe.port.onmessage({ data: 'start' }); probe.process([[new Float32Array(128)]]);
  probe.port.onmessage({ data: 'report' });
  assert.equal(probe.port.report.frameGaps, 0); assert.equal(probe.port.report.events.length, 0);
  assert.equal(probe.port.report.silent, 1);
  probe.port.onmessage({ data: 'start' });
  const reference = offset => Float32Array.from({ length: 128 }, (_, i) => (offset + i + 1) / 8388608);
  sandbox.currentFrame = 0; probe.process([input[0], [reference(0)]]);
  sandbox.currentFrame = 0; probe.process([input[0], [reference(128)]]);
  probe.port.onmessage({ data: 'report' });
  assert.equal(probe.port.report.frameGaps, 1); assert.equal(probe.port.report.signalFrameGaps, 0);
  assert.equal(probe.port.report.signalFrames, 256);
  sandbox.currentFrame = 128; probe.process([input[0], [reference(128)]]);
  probe.port.onmessage({ data: 'report' });
  assert.equal(probe.port.report.signalFrameGaps, 1);
  probe.process([input[0], [reference(512)]]);
  probe.port.onmessage({ data: 'report' });
  assert.equal(probe.port.report.signalFrameGaps, 2);
});

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
  const major = Float32Array.from(samples, (_, i) =>
    .01 * [261.626, 329.628, 391.995].reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * i / rate), 0));
  const majorTriad = analyzeContext(major, rate).keys[0];
  assert.equal(majorTriad.tonic, 0); assert.equal(majorTriad.mode, 'major');
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
