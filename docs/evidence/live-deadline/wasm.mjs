import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

const [wasm, native, output] = process.argv.slice(2);
assert.ok(output, 'Usage: node wasm.mjs ENGINE_WASM NATIVE_PREFIX NEW_REPORT_JSON');
assert.ok(!fs.existsSync(output));
const events = fs.readFileSync(`${native}.tsv`, 'utf8').trim().split('\n').slice(1).map(line => line.split('\t').map(Number));
assert.equal(events.length, 320);
events.forEach((e, i) => {
  assert.ok(e.length === 6 && e.every(Number.isInteger));
  assert.ok(e[0] % 128 === 0 && e[0] >= 0 && e[0] < 480000 && (!i || e[0] >= events[i-1][0]));
});
const module = await WebAssembly.compile(fs.readFileSync(wasm));
assert.deepEqual(WebAssembly.Module.imports(module), []);
const engine = (await WebAssembly.instantiate(module, {})).exports;
engine._initialize(); assert.equal(engine.djayvo_live_init(48000), 1);
const memoryBytes = engine.memory.buffer.byteLength;
const samples = new Float32Array(engine.memory.buffer, engine.djayvo_live_buffer(), 4096);
const frames = 480000, repeats = 60, blocks = frames / 128, deadline = 128 / 48000 * 1e6;
const reference = new Float32Array(frames * 2), times = [], attacks = [], regular = [], misses = [];
let peak = 0, square = 0, maxActive = 0, quietBlocks = 0;
const runStart = performance.now();
for (let repeat = 0; repeat < repeats; repeat++) {
  let next = 0;
  for (let frame = 0; frame < frames; frame += 128) {
    const attack = next < events.length && events[next][0] === frame && events[next][1] === 1;
    const start = performance.now(), cpuStart = process.cpuUsage();
    while (next < events.length && events[next][0] === frame) {
      const [, on, id, patch, pitch, velocity] = events[next++];
      if (on) assert.equal(engine.djayvo_live_note(id, patch, pitch, velocity), 1);
      else engine.djayvo_live_off(id);
    }
    assert.equal(engine.djayvo_live_render(128), 1);
    const cpu = process.cpuUsage(cpuStart), us = (performance.now() - start) * 1000;
    times.push(us); (attack ? attacks : regular).push(us);
    if (us > deadline) misses.push({ repeat, frame, wall_us: us, cpu_us: cpu.user + cpu.system, attack });
    maxActive = Math.max(maxActive, engine.djayvo_live_active());
    const quiet = frame % 96000 >= 91200;
    if (quiet) quietBlocks++;
    for (let i = 0; i < 256; i++) {
      const sample = samples[i];
      assert.ok(Number.isFinite(sample) && Math.abs(sample) <= Math.fround(.8));
      if (quiet) assert.ok(Math.abs(sample) < 1e-7);
      if (!repeat) reference[frame * 2 + i] = sample;
      else assert.equal(sample, reference[frame * 2 + i]);
      peak = Math.max(peak, Math.abs(sample)); square += sample * sample;
    }
  }
  assert.equal(next, events.length); assert.equal(engine.djayvo_live_active(), 0);
}
const wall = (performance.now() - runStart) / 1000;
assert.equal(engine.memory.buffer.byteLength, memoryBytes);
assert.equal(maxActive, 32); assert.ok(peak > .01 && quietBlocks > 0);
const pcm = Buffer.from(reference.buffer), original = fs.readFileSync(`${native}.f32`);
assert.deepEqual(pcm, original, 'Native and WASM first-program PCM differ');
const stats = values => {
  values.sort((a, b) => a - b);
  return Object.fromEntries([['count', values.length], ...[50, 95, 99, 100].map(q => [`p${q}_us`, values[Math.floor((values.length-1)*q/100)]])]);
};
fs.writeFileSync(output, JSON.stringify({ sample_rate: 48000, block_frames: 128, virtual_seconds: 600,
  repeats, blocks: times.length, events_per_repeat: events.length, wall_seconds: wall, peak,
  rms: Math.sqrt(square / (frames * 2 * repeats)), max_active: maxActive, quiet_blocks: quietBlocks,
  wasm_memory_bytes: memoryBytes, deadline_us: deadline, blocks_over_deadline: misses.length,
  all: stats(times), attack: stats(attacks), other: stats(regular), misses,
  pcm_sha256: crypto.createHash('sha256').update(pcm).digest('hex'),
  event_trace_sha256: crypto.createHash('sha256').update(fs.readFileSync(`${native}.tsv`)).digest('hex'),
  engine_sha256: crypto.createHash('sha256').update(fs.readFileSync(wasm)).digest('hex') }, null, 2) + '\n', { flag: 'wx' });
console.log(`PASS 600 virtual seconds, 60 identical programs, exact native PCM; deadline misses ${misses.length}`);
