import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createEngine from '../../../build-web/djayvo_web.mjs';

const root = process.cwd();
const output = path.join(root, 'renders/hiphop-diversity-20261018/wasm');
await fs.mkdir(output); // Evidence outputs are exclusive; preserve previous recordings.
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
const rate=44100,frames=rate*3;
const wav=Buffer.alloc(44+frames*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);
for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(5000*Math.sin(2*Math.PI*220*i/rate)),44+i*2);
const engine=await createEngine();engine.FS.writeFile('/input.wav',wav);
const result=engine.ccall('djayvo_web_render','string',['number','number','number'],[4123,1,2]);
console.log(JSON.stringify({input_rate:rate,input_frames:frames,result}));assert.equal(result,'');
const plan=JSON.parse(engine.FS.readFile('/mix.club.score.json',{encoding:'utf8'}));
assert.equal(plan.source.processed_frames,144000);console.log('PASS: 44.1 kHz input retains three seconds in 32-bit WebAssembly');

await fs.writeFile(path.join(output, 'timings.json'), JSON.stringify(results, null, 2) + '\n');
console.log('PASS: WASM consent, corrupt input, three styles and club', results);
