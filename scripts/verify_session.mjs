// Compare actual context renders from Mac, Linux and WebAssembly.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import createEngine from '../build-web/jamloom_web.mjs';
const [source, mac, linux, output, minorReference] = process.argv.slice(2);
if (!output) throw new Error('Usage: node scripts/verify_session.mjs input.wav MAC_DIR LINUX_DIR NEW_OUTPUT [PREVIOUS_MINOR_DIR]');
await fs.mkdir(output);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const input = await fs.readFile(source), results = [], engine = await createEngine();
engine.FS.writeFile('/input.wav', input);
const call = (tempo, tonic, permission, mode = 0) => engine.ccall('jamloom_web_session_mode', 'string', ['number', 'number', 'number', 'number', 'number'], [4123, tempo, tonic, mode, permission]);
assert.match(call(120000, 60, 0), /permission/);
assert.match(call(0, 60, 1), /context/);
assert.match(call(120000, 72, 1), /context/);
assert.match(call(120000, 60, 1, 2), /context/);
assert.match(engine.ccall('jamloom_web_session', 'string', ['number','number','number','number'], [4123,120000,60,0]), /permission/);
assert.equal(engine.FS.readdir('/').filter(name => name.startsWith('mix.')).length, 0);
for (const [tempo, majorTonic] of [[60000,60],[83920,63],[120000,66],[180000,71]]) for (const mode of [0,1]) {
  const tonic = mode ? majorTonic : 60, prefix = `session-${mode ? 'major-' : ''}${tempo}`;
  const began = performance.now();
  assert.equal(call(tempo, tonic, 1, mode), '');
  const seconds = (performance.now() - began) / 1000;
  const wasm = {};
  for (const ext of ['wav', 'score.json', 'events.tsv', 'report.json']) {
    wasm[ext] = Buffer.from(engine.FS.readFile(`/mix.call_response.${ext}`));
    await fs.writeFile(path.join(output, `${prefix}.${ext}`), wasm[ext]);
  }
  const score = JSON.parse(wasm['score.json']);
  assert.deepEqual(score.key, { tonic_midi: tonic, mode: mode ? 'major' : 'minor' });
  if (mode) assert.equal(score.schema_version, '1.7-remix');
  const scale = mode ? [0,2,4,5,7,9,11] : [0,2,3,5,7,8,10];
  for (const track of score.tracks) if (track.instrument !== 'drums') for (const event of track.events)
    assert.ok(scale.includes((event.note - tonic + 120) % 12));
  if (!mode) {
    assert.equal(engine.ccall('jamloom_web_session', 'string', ['number','number','number','number'], [4123,tempo,60,1]), '');
    for (const ext of ['wav','score.json','events.tsv']) {
      assert.deepEqual(Buffer.from(engine.FS.readFile(`/mix.call_response.${ext}`)), wasm[ext], 'legacy minor ABI changed');
      if (minorReference) assert.deepEqual(await fs.readFile(path.join(minorReference, `${prefix}.${ext}`)), wasm[ext], 'historical minor output changed');
    }
  }
  const comparisons = [];
  for (const [name, folder] of [['mac', mac], ['linux', linux]]) {
    const score = await fs.readFile(path.join(folder, `${prefix}.score.json`));
    const events = await fs.readFile(path.join(folder, `${prefix}.events.tsv`));
    const audio = await fs.readFile(path.join(folder, `${prefix}.wav`));
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
  results.push({ tempo, tonic, mode: mode ? 'major' : 'minor', seconds, report: JSON.parse(wasm['report.json']), wasm_sha256: hash(wasm.wav), comparisons });
}
const macGrid = await fs.readFile(path.join(mac, 'grid.tsv')), linuxGrid = await fs.readFile(path.join(linux, 'grid.tsv'));
assert.deepEqual(macGrid, linuxGrid);
const module = (await WebAssembly.instantiate(await fs.readFile('build-web/jamloom_live.wasm'), {})).instance.exports;
module._initialize();
for (const line of macGrid.toString().trim().split('\n')) {
  const [rate, tempo, frame] = line.split('\t').map(Number);
  assert.equal(module.jamloom_next_bar(rate * 21600, 17, rate, tempo), frame);
}
await fs.writeFile(path.join(output, 'comparison.json'), JSON.stringify({ status: 'PASS', source_sha256: hash(input), grid: 'PASS', wasm_input_rejection: 'PASS', legacy_minor_abi: 'PASS', historical_minor: minorReference ? 'PASS' : 'NOT RUN', results, listening: 'NOT RUN' }, null, 2));
console.log('PASS: eight major/minor context plans, exact event frames, PCM tolerances and six-hour grids across Mac/Linux/WASM:', output);
