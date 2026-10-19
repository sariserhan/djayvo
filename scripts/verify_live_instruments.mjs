import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
const [wasmPath, nativePath, linuxPath, output] = process.argv.slice(2);
assert.ok(output, 'Usage: node scripts/verify_live_instruments.mjs WASM MAC_PCM LINUX_PCM NEW_OUTPUT_DIR');
fs.mkdirSync(output); // Refuse to replace any prior recordings/evidence.
const module = await WebAssembly.compile(fs.readFileSync(wasmPath));
assert.deepEqual(WebAssembly.Module.imports(module), []);
const engine = (await WebAssembly.instantiate(module, {})).exports;
engine._initialize();
const buffer = new Float32Array(engine.memory.buffer, engine.djayvo_live_buffer(), 4096);
assert.equal(engine.djayvo_live_init(48000), 1);
for (let pitch = 21; pitch <= 108; pitch++) {
  engine.djayvo_live_init(48000); assert.equal(engine.djayvo_live_note(1, 0, pitch, 100), 1);
  let energy = 0;
  for (let block = 0; block < 32; block++) { engine.djayvo_live_render(128); for (let i = 0; i < 256; i++) energy += Math.abs(buffer[i]); }
  assert.ok(energy > .001, `Silent key ${pitch}`);
}
const pcm = new Float32Array(11 * 750 * 256), events = [];
let offset = 0;
for (let patch = 0; patch < 11; patch++) {
  engine.djayvo_live_init(48000);
  events.push({ patch, noteOnFrame: 0, noteOffFrame: 23936, totalFrames: 96000 });
  for (let block = 0; block < 750; block++) {
    if (!block) assert.equal(engine.djayvo_live_note(1, patch, patch >= 9 ? 36 : 60, 100), 1);
    if (block === 187) engine.djayvo_live_off(1);
    engine.djayvo_live_render(128); pcm.set(buffer.subarray(0, 256), offset); offset += 256;
  }
}
const comparisons = [];
for (const [platform, filename] of [['macOS', nativePath], ['Linux', linuxPath]]) {
  const bytes = fs.readFileSync(filename), reference = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  assert.equal(reference.length, pcm.length);
  for (let patch = 0; patch < 11; patch++) {
    let max = 0, sum = 0, peak = 0;
    for (let i = patch * 192000; i < (patch + 1) * 192000; i++) {
      assert.ok(Number.isFinite(pcm[i]) && Number.isFinite(reference[i]));
      const delta = pcm[i] - reference[i]; max = Math.max(max, Math.abs(delta)); sum += delta * delta; peak = Math.max(peak, Math.abs(pcm[i]));
    }
    const rms = Math.sqrt(sum / 192000); assert.ok(rms < 1e-5 && max < .001 && peak <= .8, `${platform} patch ${patch} mismatch`);
    comparisons.push({ platform, patch, maxAbsoluteDifference: max, rmsDifference: rms, peak });
  }
}
engine.djayvo_live_init(48000);
const noteTimes = [];
for (let id = 1; id <= 32; id++) { const start = performance.now(); assert.equal(engine.djayvo_live_note(id, 6, 40 + id, 100), 1); noteTimes.push(performance.now() - start); }
assert.equal(engine.djayvo_live_note(33, 6, 60, 100), 0);
const times = [];
for (let i = 0; i < 4000; i++) { const start = performance.now(); engine.djayvo_live_render(128); if (i >= 100) times.push(performance.now() - start); }
times.sort((a,b) => a-b);
const wav = Buffer.alloc(44 + pcm.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(192000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
fs.writeFileSync(path.join(output, 'instrument-palette.wav'), wav);
const report = { status: 'PASS', notes: 88, patches: 11, channels: 2, sampleRate: 48000, seconds: 22, events,
  frameAgreement: 'PASS: identical explicit frame-zero note-on and frame-23936 note-off program, 96000 frames per patch in native and WASM', comparisons,
  wasm32VoiceTiming: { blockFrames: 128, blockBudgetMs: 128 / 48, measuredBlocks: times.length, p50Ms: times[Math.floor(times.length * .5)], p95Ms: times[Math.floor(times.length * .95)], p99Ms: times[Math.floor(times.length * .99)], maxMs: times.at(-1), maxNoteOnMs: Math.max(...noteTimes), limitation: 'Node WASM compute only; not device, browser scheduling or end-to-end latency' },
  humanListening: 'NOT RUN', hardwareLatency: 'NOT RUN' };
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, output, timing: report.wasm32VoiceTiming }, null, 2));
