// Replay a private browser instrument take using this checkout's existing shared-engine WASM.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { replayTake } from '../apps/web/live-take.js';
const [tracePath, output, ...extra] = process.argv.slice(2);
if (!tracePath || !output || extra.length) throw new Error('Usage: node scripts/replay_live_take.mjs TAKE.json NEW_OUTPUT.wav');
const stat = await fs.lstat(tracePath);
if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Take must be a regular JSON file of at most 2 MiB');
const take = JSON.parse(await fs.readFile(tracePath, 'utf8'));
const engine = await fs.readFile(fileURLToPath(new URL('../dist/web/engine/jamloom_live.wasm', import.meta.url)));
const wav = await replayTake(take, engine);
await fs.writeFile(output, Buffer.from(wav), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({status:'PASS', frames:take.frames, sample_rate:take.sample_rate,
  accepted_commands:take.events.length, wav_sha256:take.wav_sha256, training_authorized:false,
  scope:'Exact private instrument replay; rights and musical quality are not established'},null,2));
