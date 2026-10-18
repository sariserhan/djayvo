import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createEngine from '../../../build-web/djayvo_web.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = path.join(root, 'renders/web-validation/wasm');
await fs.mkdir(output, { recursive: true });
const input = new Uint8Array(await fs.readFile(path.join(root, 'renders/fixtures/synthetic-speech.wav')));
const results = [];
for (const club of [0, 1]) {
  const engine = await createEngine();
  engine.FS.writeFile('/input.wav', input);
  const call = permission => engine.ccall('djayvo_web_render', 'string', ['number', 'number', 'number'], [4123, club, permission]);
  assert.match(call(0), /permission/);
  assert.equal(engine.FS.readdir('/').filter(name => name.startsWith('mix.')).length, 0);
  const started = performance.now();
  assert.equal(call(2), '');
  const files = engine.FS.readdir('/').filter(name => name.startsWith('mix.'));
  assert.equal(files.length, club ? 4 : 12);
  for (const name of files) await fs.writeFile(path.join(output, name), engine.FS.readFile(`/${name}`));
  results.push({ style: club ? 'club' : 'three', seconds: (performance.now() - started) / 1000, memory_bytes: engine.HEAPU8?.length ?? null });
}
const broken = await createEngine();
broken.FS.writeFile('/input.wav', new Uint8Array([1, 2, 3]));
assert.match(broken.ccall('djayvo_web_render', 'string', ['number', 'number', 'number'], [1, 0, 2]), /WAV/);
await fs.writeFile(path.join(output, 'timings.json'), JSON.stringify(results, null, 2) + '\n');
console.log('PASS: WASM consent, corrupt input, three styles and club', results);
