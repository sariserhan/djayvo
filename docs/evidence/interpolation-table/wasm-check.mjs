// Compare the retained old engine with the candidate; no browser or timing claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const folder = new URL('../../../renders/interpolation-table-20261019/', import.meta.url);
const paths = [new URL('before.wasm', folder), new URL('../../../dist/web/engine/djayvo_live.wasm', import.meta.url)];
const engines = [], binaries = [];
for (const path of paths) {
  const bytes = await fs.readFile(path);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  instance.exports._initialize(); engines.push(instance.exports);
  binaries.push(crypto.createHash('sha256').update(bytes).digest('hex'));
}
const hash = crypto.createHash('sha256');
let cases = 0, frames = 0, peak = 0;
for (const rate of [32000, 44100, 48000, 96000, 192000])
  for (let patch = 0; patch < 13; patch++)
    for (const pitch of [21, 48, 60, 61, 84, 108])
      for (const velocity of [40, 95, 127]) {
        const note = patch === 4 || patch === 5 ? 40 + pitch % 40 :
          patch === 9 || patch === 10 ? [36, 38, 42, 46][pitch % 4] :
          patch === 12 ? [37, 39, 41, 70][pitch % 4] : pitch;
        cases++;
        for (const engine of engines) {
          assert.equal(engine.djayvo_live_init(rate), 1);
          assert.equal(engine.djayvo_live_active(), 0);
          assert.equal(engine.djayvo_live_note(cases, patch, note, velocity), 1);
        }
        for (let block = 0; block < 8; block++) {
          const samples = engines.map(engine => {
            if (block === 2) engine.djayvo_live_off(cases);
            assert.equal(engine.djayvo_live_render(128), 1);
            return Buffer.from(engine.memory.buffer, engine.djayvo_live_buffer(), 128 * 8);
          });
          assert.ok(samples[0].equals(samples[1]), `PCM mismatch at ${rate}/${patch}/${note}/${velocity}/${block}`);
          const values = new Float32Array(samples[1].buffer, samples[1].byteOffset, 256);
          for (const value of values) { assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); }
          hash.update(samples[1]); frames += 128;
        }
      }
assert.equal(cases, 1170); assert.ok(peak > .01 && peak <= .8);
const result = { status: 'PASS', node: process.version, cases, stereo_frames: frames, peak,
  pcm_sha256: hash.digest('hex'), before_wasm_sha256: binaries[0], after_wasm_sha256: binaries[1],
  maximum_pcm_difference: 0, rms_pcm_difference: 0, command_frames: 'exact: note on 0, off 256',
  timing: 'NOT RUN', listening: 'NOT RUN' };
await fs.writeFile(new URL('wasm-notes.json', folder), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
