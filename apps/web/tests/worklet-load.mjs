import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/worklet-load-${kind}-`));
console.log('Artifacts:', output);
const read = name => fs.readFile(path.join(root, name));
const [production, wrapper, capture, engine, reference, trace] = await Promise.all([
  read('apps/web/instrument-worklet.js'), read('apps/web/tests/worklet-load.js'),
  read('apps/web/tests/worklet-capture.js'), read('dist/web/engine/djayvo_live.wasm'),
  read('renders/live-deadline-20261019/mac-detailed.f32'), read('renders/live-deadline-20261019/mac-detailed.tsv')
]);
const events = trace.toString().trim().split('\n').slice(1).map(line => line.split('\t').map(Number));
assert.equal(events.length, 320); assert.equal(reference.length, 480000 * 8);
events.forEach((e, i) => assert.ok(e.length === 6 && e.every(Number.isInteger) &&
  e[0] % 128 === 0 && e[0] < 480000 && e[0] >= (i ? events[i-1][0] : 0)));
const frames = 48000 * 60;
const assets = new Map([
  ['/', ['text/html', Buffer.from('<!doctype html><title>Djayvo worklet diagnostic</title><h1>Djayvo worklet diagnostic</h1><p>Sixty seconds of muted instrument processing.</p><button id="start">Start check</button><p id="status">Preparing</p>')]],
  ['/instrument.js', ['text/javascript', Buffer.concat([production, Buffer.from('\n'), wrapper])]],
  ['/capture.js', ['text/javascript', capture]], ['/engine.wasm', ['application/wasm', engine]]
]);
const uploads = new Map([['/capture', ['capture.f32', frames * 8]],
  ['/timestamps', ['timestamps.f64', frames / 128 * 8]], ['/durations', ['durations.f64', frames / 128 * 8]],
  ['/commands', ['commands.u32', 1920 * 4]]]);
const server = createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && uploads.has(request.url)) {
      const [name, expected] = uploads.get(request.url), chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > expected) throw new Error('Upload exceeds capture bound'); chunks.push(chunk); }
      assert.equal(size, expected); await fs.writeFile(path.join(output, name), Buffer.concat(chunks), { flag: 'wx' });
      response.writeHead(200); response.end('stored'); return;
    }
    if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const asset = request.method === 'GET' && assets.get(request.url);
    if (!asset) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': asset[0], 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    response.end(asset[1]);
  } catch (error) { response.writeHead(500); response.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const errors = [], external = [];
try {
  browser = await { chromium, webkit }[kind].launch({ headless: true, ...(kind === 'chromium' ? { ignoreDefaultArgs: ['--mute-audio'] } : {}) });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(`${origin}/`)) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(origin); await page.waitForLoadState('networkidle');
  assert.equal(await page.title(), 'Djayvo worklet diagnostic');
  await page.evaluate(async ({ events, frames }) => {
    const context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    await context.suspend();
    if (context.sampleRate !== 48000) throw new Error('Unexpected context sample rate');
    const module = await WebAssembly.compile(await (await fetch('/engine.wasm')).arrayBuffer());
    await context.audioWorklet.addModule('/instrument.js'); await context.audioWorklet.addModule('/capture.js');
    const source = new AudioWorkletNode(context, 'instrument-load-probe', { numberOfInputs: 0,
      outputChannelCount: [2], processorOptions: { module, events, frames } });
    const tap = new AudioWorkletNode(context, 'instrument-capture', { numberOfInputs: 2,
      outputChannelCount: [2], processorOptions: { frames } });
    const reference = context.createBufferSource(); reference.buffer = context.createBuffer(1, frames, 48000);
    const counter = reference.buffer.getChannelData(0);
    for (let i = 0; i < counter.length; i++) counter[i] = (i + 1) / 8388608;
    source.connect(tap, 0, 0); reference.connect(tap, 0, 1);
    const mute = context.createGain(); mute.gain.value = 0; tap.connect(mute); mute.connect(context.destination);
    const wait = (node, type) => new Promise((resolve, reject) => {
      node.onprocessorerror = () => reject(new Error(`${type} processor error`));
      node.port.onmessage = ({ data }) => {
        if (data.type === type) resolve(data);
        else if (data.type === 'rejected') reject(new Error('Instrument note rejected'));
      };
    });
    const startTime = context.currentTime;
    reference.start(startTime);
    let started;
    window.done = false;
    Promise.all([wait(source, 'engine-complete'), wait(tap, 'capture-complete')]).then(async ([engine, capture]) => {
      const wallSeconds = (performance.now() - started) / 1000;
      await context.suspend();
      const playbackStats = context.playbackStats?.toJSON?.() ?? null;
      await Promise.all([['/capture', capture.pcm], ['/timestamps', capture.frames], ['/durations', engine.durations],
        ['/commands', engine.commandFrames]].map(async ([url, bytes]) => {
        const response = await fetch(url, { method: 'POST', body: bytes }); if (!response.ok) throw new Error(`Capture save failed: ${url}`);
      }));
      window.result = { wallSeconds, sampleRate: context.sampleRate, baseLatency: context.baseLatency,
        outputLatency: context.outputLatency ?? null, playbackStats, outputTimestamp: context.getOutputTimestamp?.() ?? null,
        startTime, contextTime: context.currentTime, userAgent: navigator.userAgent,
        engine: { commands: engine.commands, clock: engine.clock, memoryBytes: engine.memoryBytes, active: engine.active },
        capture: { counterGaps: capture.counterGaps, timestampGaps: capture.timestampGaps, lastCounter: capture.lastCounter } };
      document.getElementById('status').textContent = 'Capture complete';
    }).catch(error => { window.result = { error: error.message }; }).finally(async () => {
      source.disconnect(); tap.disconnect(); reference.disconnect(); mute.disconnect(); await context.close(); window.done = true;
    });
    document.getElementById('start').onclick = async () => {
      document.getElementById('start').disabled = true; document.getElementById('status').textContent = 'Running — output muted';
      started = performance.now(); await context.resume();
    };
    document.getElementById('status').textContent = 'Ready';
  }, { events, frames });
  await page.locator('#start').click();
  await page.waitForFunction(() => window.done, null, { timeout: 90000 });
  const result = await page.evaluate(() => window.result);
  result.browser = kind; result.version = browser.version(); result.errors = errors; result.externalRequests = external;
  result.runner = { node: process.version, platform: process.platform, architecture: process.arch };
  result.hashes = Object.fromEntries([['production_processor', production], ['engine', engine], ['reference_pcm', reference],
    ['event_trace', trace], ['probe', wrapper], ['capture', capture], ['runner', await fs.readFile(fileURLToPath(import.meta.url))]]
    .map(([key, bytes]) => [key, crypto.createHash('sha256').update(bytes).digest('hex')]));
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  assert.ok(!result.error, result.error); assert.deepEqual(errors, []); assert.deepEqual(external, []);
  assert.equal(result.engine.commands, 1920); assert.equal(result.engine.active, 0);
  assert.equal(result.capture.lastCounter, frames); assert.equal(result.capture.counterGaps, 0);
  const actual = await fs.readFile(path.join(output, 'capture.f32'));
  for (let repeat = 0; repeat < 6; repeat++) assert.deepEqual(actual.subarray(repeat * reference.length, (repeat+1) * reference.length), reference);
  const commands = await fs.readFile(path.join(output, 'commands.u32'));
  events.forEach((event, i) => {
    for (let repeat = 0; repeat < 6; repeat++)
      assert.equal(commands.readUInt32LE((repeat * events.length + i) * 4), repeat * 480000 + event[0]);
  });
  console.log('PASS real-time worklet PCM, commands and independent counter; timestamp gaps:', result.capture.timestampGaps);
  console.log(JSON.stringify(result));
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: error.stack,
    browser: kind, version: browser?.version(), errors, externalRequests: external }, null, 2) + '\n', { flag: 'wx' });
  throw error;
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
