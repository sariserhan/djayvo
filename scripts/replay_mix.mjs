// Private offline action reconstruction. No server, provider calls or real audio output.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from '../apps/web/node_modules/playwright/index.mjs';
import { validateMixReplay } from '../apps/web/mix-replay.js';
import { replayAudio } from './replay_audio.mjs';
import { sha256 } from '../apps/web/live-take.js';

const [inputPath, assetsPath, outputPath, ...extra] = process.argv.slice(2);
if (!inputPath || !assetsPath || !outputPath || extra.length)
  throw Error('Usage: node scripts/replay_mix.mjs REPLAY.json ASSETS.json NEW_OUTPUT_DIRECTORY');
const kind = process.env.JAMLOOM_BROWSER ?? 'chromium';
if (!['chromium', 'webkit'].includes(kind)) throw Error('Choose chromium or webkit');
async function read(file, limit) {
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > limit) throw Error('Replay file is not a bounded regular file');
    const bytes = await handle.readFile();
    if (bytes.length !== stat.size) throw Error('Replay file changed while reading');
    return bytes;
  } finally { await handle.close(); }
}
const inputBytes = await read(inputPath, 8 * 1024 * 1024), input = JSON.parse(inputBytes);
validateMixReplay(input);
const bindings = JSON.parse(await read(assetsPath, 64 * 1024));
const hashes = [...new Set(input.sources.assets.map(a => a.sha256))];
if (!bindings || Array.isArray(bindings) || typeof bindings !== 'object' ||
    Object.keys(bindings).sort().join(',') !== hashes.sort().join(',') ||
    !Object.values(bindings).every(value => typeof value === 'string' && value.length > 0 && value.length < 4096))
  throw Error('Assets must map every recorded SHA-256 to a local file');
const assets = new Map(), audio = new Map(); let decodedBytes = 0;
for (const hash of hashes) {
  const bytes = await read(path.resolve(path.dirname(assetsPath), bindings[hash]), 100 * 1024 * 1024);
  if (await sha256(bytes) !== hash || input.sources.assets.some(a => a.sha256 === hash && a.bytes !== bytes.length)) throw Error('Source hash or size mismatch');
  assets.set(hash, bytes);
  if (input.sources.assets.some(a => a.sha256 === hash && ['local_audio','generated_wav','normalized_phrase_wav'].includes(a.kind))) {
    const canonical = await replayAudio(bytes, input.recording.sample_rate); decodedBytes += canonical.length;
    if (decodedBytes > 256 * 1024 * 1024) throw Error('Decoded audio exceeds 256 MiB');
    audio.set(hash, canonical);
  }
}
const root = fileURLToPath(new URL('../apps/web/', import.meta.url));
const modules = new Set((await fs.readdir(root)).filter(name => name.endsWith('.js')));
await fs.mkdir(outputPath, { mode: 0o700 }); // Exclusive directory creation preserves earlier exports.
let browser, timer;
try {
  browser = await { chromium, webkit }[kind].launch();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== 'https://jamloom-replay.test' || request.method() !== 'GET') {
      errors.push('Unexpected network request'); return route.abort();
    }
    const name = url.pathname.slice(1);
    const headers = { 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'" };
    if (!name) return route.fulfill({ contentType: 'text/html', headers, body: '<!doctype html><title>Private mix replay</title>' });
    if (name === 'input.json') return route.fulfill({ contentType: 'application/json', headers, body: inputBytes });
    if (name.startsWith('audio/') && audio.has(name.slice(6))) return route.fulfill({ contentType: 'audio/wav', headers, body: audio.get(name.slice(6)) });
    if (name.startsWith('asset/') && assets.has(name.slice(6))) return route.fulfill({ contentType: 'application/octet-stream', headers, body: assets.get(name.slice(6)) });
    if (modules.has(name)) return route.fulfill({ contentType: 'text/javascript', headers, body: await fs.readFile(path.join(root, name)) });
    errors.push('Unexpected replay resource'); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const result = await Promise.race([(async () => {
    await page.goto('https://jamloom-replay.test/');
    return page.evaluate(async () => {
      const { replayMix } = await import('/mix-replay.js');
      const input = await (await fetch('/input.json')).json();
      const { wav, report } = await replayMix(input, async hash => (await fetch('/asset/' + hash)).arrayBuffer(),
        async (_, asset) => (await fetch('/audio/' + asset.sha256)).arrayBuffer());
      const bytes = new Uint8Array(wav); let binary = '';
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      return { wav: btoa(binary), report };
    });
  })(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Replay exceeded its 120-second deadline')), 120000); })]);
  if (errors.length) throw Error(errors.join('; '));
  const wav = Buffer.from(result.wav, 'base64');
  if (await sha256(wav) !== result.report.replay_wav_sha256) throw Error('Replay transfer hash mismatch');
  await fs.writeFile(path.join(outputPath, 'replay.wav'), wav, { flag: 'wx', mode: 0o600 });
  await fs.writeFile(path.join(outputPath, 'report.json'), JSON.stringify({ ...result.report,
    browser: kind, browser_version: browser.version(), network: 'intercepted locally; no external requests',
    playback: 'offline render only', input_file_sha256: await sha256(inputBytes) }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: 'PASS', output: outputPath, ...result.report }, null, 2));
} finally { clearTimeout(timer); await browser?.close(); }
