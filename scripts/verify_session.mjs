// Compare actual context renders from Mac, Linux and WebAssembly.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import createEngine from '../build-web/djayvo_web.mjs';
const [source, mac, linux, output] = process.argv.slice(2);
if (!output) throw new Error('Usage: node scripts/verify_session.mjs input.wav MAC_DIR LINUX_DIR NEW_OUTPUT');
await fs.mkdir(output);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const input = await fs.readFile(source), results = [], engine = await createEngine();
engine.FS.writeFile('/input.wav', input);
const call = (tempo, tonic, permission) => engine.ccall('djayvo_web_session', 'string', ['number', 'number', 'number', 'number'], [4123, tempo, tonic, permission]);
assert.match(call(120000, 60, 0), /permission/);
assert.match(call(0, 60, 1), /context/);
assert.match(call(120000, 72, 1), /context/);
assert.equal(engine.FS.readdir('/').filter(name => name.startsWith('mix.')).length, 0);
for (const tempo of [60000, 83920, 120000, 180000]) {
  const began = performance.now();
  assert.equal(call(tempo, 60, 1), '');
  const seconds = (performance.now() - began) / 1000;
  const wasm = {};
  for (const ext of ['wav', 'score.json', 'events.tsv', 'report.json']) {
    wasm[ext] = Buffer.from(engine.FS.readFile(`/mix.call_response.${ext}`));
    await fs.writeFile(path.join(output, `session-${tempo}.${ext}`), wasm[ext]);
  }
  const comparisons = [];
  for (const [name, folder] of [['mac', mac], ['linux', linux]]) {
    const score = await fs.readFile(path.join(folder, `session-${tempo}.score.json`));
    const events = await fs.readFile(path.join(folder, `session-${tempo}.events.tsv`));
    const audio = await fs.readFile(path.join(folder, `session-${tempo}.wav`));
    assert.deepEqual(JSON.parse(score), JSON.parse(wasm['score.json']), `${name} plan mismatch`);
    assert.deepEqual(events, wasm['events.tsv'], `${name} event-frame mismatch`);
    assert.equal(audio.length, wasm.wav.length);
    assert.equal(audio.toString('ascii', 36, 40), 'data');
    let peak = 0, sum = 0;
    for (let i = 44; i < audio.length; i += 2) {
      const difference = (audio.readInt16LE(i) - wasm.wav.readInt16LE(i)) / 32768;
      peak = Math.max(peak, Math.abs(difference)); sum += difference * difference;
    }
    const rms = Math.sqrt(sum / ((audio.length - 44) / 2));
    assert.ok(peak <= .001 && rms <= .0001, 'PCM exceeds existing portability tolerance');
    comparisons.push({ platform: name, plans: 'PASS', event_frames: 'PASS', waveform_max_absolute: peak, waveform_rms: rms, sha256: hash(audio) });
  }
  results.push({ tempo, seconds, report: JSON.parse(wasm['report.json']), wasm_sha256: hash(wasm.wav), comparisons });
}
const macGrid = await fs.readFile(path.join(mac, 'grid.tsv')), linuxGrid = await fs.readFile(path.join(linux, 'grid.tsv'));
assert.deepEqual(macGrid, linuxGrid);
const module = (await WebAssembly.instantiate(await fs.readFile('build-web/djayvo_live.wasm'), {})).instance.exports;
module._initialize();
for (const line of macGrid.toString().trim().split('\n')) {
  const [rate, tempo, frame] = line.split('\t').map(Number);
  assert.equal(module.djayvo_next_bar(rate * 21600, 17, rate, tempo), frame);
}
await fs.writeFile(path.join(output, 'comparison.json'), JSON.stringify({ status: 'PASS', source_sha256: hash(input), grid: 'PASS', wasm_input_rejection: 'PASS', results, listening: 'NOT RUN' }, null, 2));
console.log('PASS: four context plans, exact event frames, PCM tolerances and six-hour grids across Mac/Linux/WASM:', output);
