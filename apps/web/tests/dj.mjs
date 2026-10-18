import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(kind)) throw new Error(`Unsupported DJAYVO_BROWSER: ${kind}`);
const output = await fs.mkdtemp(path.join(root, `renders/dj-${kind}-`));
console.log('Artifacts:', output);
const publicRoot = path.join(root, 'dist/web');
const serverRequests = [];
const server = createServer(async (request, response) => {
  serverRequests.push(request.url);
  const name = new URL(request.url, 'http://local').pathname.slice(1);
  if (request.method !== 'GET' || !/^[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').includes('..')) {
    response.writeHead(404); response.end(); return;
  }
  try {
    const bytes = await fs.readFile(path.join(publicRoot, name));
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' })[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await { chromium, webkit }[kind].launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const errors = [], requests = [], checks = [], warnings = [];
let screenshot = false;
// Silence only the physical test output, downstream of the application's measured mix.
await context.addInitScript(() => {
  const Native = window.AudioContext || window.webkitAudioContext;
  window.AudioContext = class extends Native {
    constructor(options) { super(options); window.testAudioContext = this; }
    createAnalyser() {
      const analyser = super.createAnalyser();
      const connect = analyser.connect.bind(analyser);
      analyser.connect = destination => {
        if (destination === this.destination) {
          const mute = this.createGain(); mute.gain.value = 0;
          connect(mute); mute.connect(destination); return destination;
        }
        return connect(destination);
      };
      (window.testMeters ||= []).push(analyser);
      window.testMeter = window.testMeters[0];
      return analyser;
    }
  };
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = url => {
    if ([...document.querySelectorAll('audio')].some(audio => audio.getAttribute('src') === url))
      console.error('Revoked URL is still attached to a deck');
    revoke(url);
  };
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') {
    if (screenshot && kind === 'webkit' && message.text().startsWith('Refused to apply a stylesheet')) warnings.push(message.text());
    else errors.push(message.text());
  }
});
context.on('request', request => requests.push({ url: request.url(), method: request.method() }));
const check = name => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
const set = async (id, value) => { await page.locator(id).fill(String(value)); await page.locator(id).dispatchEvent('input'); };
const peak = () => page.evaluate(() => {
  const data = new Float32Array(window.testMeter.fftSize); window.testMeter.getFloatTimeDomainData(data);
  return Math.max(...data.map(Math.abs));
});
const capture = async name => {
  screenshot = true;
  try { await page.screenshot({ path: path.join(output, name), fullPage: true }); }
  finally { screenshot = false; }
};
function tone(frequency, stereo = false) {
  const rate = 48000, frames = rate * 60;
  const channels = stereo ? 2 : 1;
  const buffer = Buffer.alloc(44 + frames * 2 * channels);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2 * channels, 28); buffer.writeUInt16LE(2 * channels, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(frames * 2 * channels, 40);
  for (let i = 0; i < frames; i++) {
    const sample = Math.round(8192 * Math.sin(2 * Math.PI * frequency * i / rate));
    buffer.writeInt16LE(sample, 44 + i * 2 * channels);
    if (stereo) buffer.writeInt16LE(-sample, 46 + i * 2 * channels);
  }
  return { name: `test-${frequency}.wav`, mimeType: 'audio/wav', buffer };
}
const a = tone(220), b = tone(440);
let signalEvidence;
try {
  await page.goto(`${origin}/dj.html`);
  assert.match(await page.title(), /Djayvo — DJ workspace/);
  await page.getByRole('heading', { name: 'Find the next move.' }).waitFor();
  assert.equal(await page.locator('#file-a').isDisabled(), true);
  assert.equal(await page.locator('#play-a').isDisabled(), true);
  check('page identity, nonblank content, consent gating');
  signalEvidence = [];
  // Keep each signal experiment small; the combined nested loop triggered a
  // JavaScriptCore optimizer crash in the installed WebKit test runtime.
  for (const values of [[0, [1, 1], 1, .2], [1, [1, 1], 1, -.4], [.5, [1, 1], 1, -.1], [.5, [0, 1], 1, -.2], [.5, [1, 1], 0, 0]]) {
    signalEvidence.push(await page.evaluate(async values => {
      const { createMixer, updateMixer } = await import('./mixer.js');
      const [crossfade, levels, master, expected] = values;
      const offline = new OfflineAudioContext(2, 4800, 48000), mixer = createMixer(offline);
      const first = offline.createConstantSource(), second = offline.createConstantSource();
      first.offset.value = .25; second.offset.value = -.5;
      first.connect(mixer.channels[0]); second.connect(mixer.channels[1]);
      first.start(); second.start();
      updateMixer(offline, mixer, crossfade, levels, master);
      const audio = await offline.startRendering();
      let error = 0;
      for (let channel = 0; channel < 2; channel++) {
        const samples = audio.getChannelData(channel);
        for (let i = 4000; i < samples.length; i++) error = Math.max(error, Math.abs(samples[i] - expected));
      }
      if (error > 1e-6) throw new Error(`Audio mix mismatch ${error}`);
      return { crossfade, levels, master, expected, maxError: error };
    }, values));
  }
  check('real offline stereo PCM: A/B endpoints, center, channel mute, master mute');
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.locator('#file-b').setInputFiles(b);
  await page.waitForFunction(() => !document.querySelector('#play-b').disabled);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > .2);
  await page.locator('#play-b').click();
  await page.waitForFunction(() => document.querySelector('#audio-b').currentTime > .2);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  assert.equal(await page.locator('#file-a').isDisabled(), true);
  const aPeak = await peak(); assert.ok(aPeak > .1 && aPeak < .2, aPeak);
  check('two media decks advance independently; active-track replacement blocked; actual mix signal present');
  await set('#crossfade', 1); await set('#level-b', 0); await page.waitForTimeout(200);
  const channelSilent = await peak(); assert.ok(channelSilent < .0001, channelSilent);
  await set('#level-b', 1); await page.waitForTimeout(200);
  assert.ok(await peak() > .1);
  await set('#master', 0); await page.waitForTimeout(200);
  const masterSilent = await peak(); assert.ok(masterSilent < .0001, masterSilent);
  await set('#master', .75); await set('#crossfade', .5);
  check('real media output follows crossfader, channel level and master silence');
  await page.locator('#play-a').click();
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), true);
  assert.equal(await page.locator('#audio-b').evaluate(audio => audio.paused), false);
  await set('#seek-a', 12);
  await page.waitForFunction(() => Math.abs(document.querySelector('#audio-a').currentTime - 12) < .2);
  await page.locator('#file-a').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('invalid audio') });
  await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('Previous track kept'));
  assert.equal(await page.locator('#name-a').textContent(), a.name);
  assert.equal(await page.locator('#audio-b').evaluate(audio => audio.paused), false);
  check('pause/seek one deck and reject corrupt replacement while other deck continues');
  await page.locator('#play-a').click();
  await capture('desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await capture('mobile.png');
  check('desktop and mobile controls render without horizontal overflow');
  await page.locator('#pause-all').click();
  assert.equal(await page.locator('audio').evaluateAll(nodes => nodes.every(a => a.paused)), true);
  await page.locator('#play-b').click();
  await page.evaluate(() => window.testAudioContext.suspend());
  await page.waitForFunction(() => [...document.querySelectorAll('audio')].every(a => a.paused));
  assert.match(await page.locator('#mixer-status').textContent(), /interrupted/);
  await page.locator('#play-b').click();
  await page.waitForFunction(() => !document.querySelector('#audio-b').paused);
  check('pause-all and audio-context interruption require explicit resume');
  await page.locator('#pause-all').click();
  await page.locator('#file-a').setInputFiles(tone(330, true));
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await set('#crossfade', 0);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => document.querySelector('#output-meter').value > .1);
  assert.ok(await peak() < .0001);
  check('opposite-polarity stereo remains visible on output meter despite mono cancellation');
  await page.locator('#music-rights').uncheck();
  assert.equal(await page.locator('audio').evaluateAll(nodes => nodes.every(a => a.paused && !a.getAttribute('src'))), true);
  assert.equal(await page.locator('#play-b').isDisabled(), true);
  check('revoking permission stops and detaches both decks');
  // Prepare the same audited cache as the existing offline control, then reload disconnected.
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // Match the existing offline runner: stop the real server. WebKit offline
  // emulation rejects some service-worker navigations before consulting cache.
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  const requestsBeforeDisconnect = serverRequests.length;
  await page.reload();
  await page.getByRole('heading', { name: 'Find the next move.' }).waitFor();
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > .2);
  await page.waitForFunction(() => {
    const samples = new Float32Array(window.testMeter.fftSize);
    window.testMeter.getFloatTimeDomainData(samples);
    return samples.some(value => Math.abs(value) > .1);
  }, null, { timeout: 5000 });
  assert.equal(serverRequests.length, requestsBeforeDisconnect);
  check('prepared app reloads with server disconnected and plays newly selected local audio');
  await page.locator('#clear-a').click();
  assert.equal(await page.locator('#audio-a').getAttribute('src'), null);
  check('unload releases the deck source');
  const audioContextEvidence = await page.evaluate(() => ({ sampleRate: testAudioContext.sampleRate, baseLatency: testAudioContext.baseLatency ?? null, outputLatency: testAudioContext.outputLatency ?? null, note: 'Browser-reported values, not hardware latency measurements' }));
  await page.reload();
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.evaluate(() => { window.AudioContext.prototype.createGain = () => { throw new Error('Injected graph failure'); }; });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('#play-a').click();
    await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('Mixer could not initialize'));
    assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), true);
  }
  check('failed graph initialization stays silent on repeated Play; no unprocessed fallback');

  assert.equal(requests.some(r => r.method !== 'GET' || (!r.url.startsWith(`${origin}/`) && !r.url.startsWith(`blob:${origin}/`))), false);
  assert.deepEqual(errors, []);
  check('no upload/external request, URL-release errors or app console errors');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', browser: kind, version: browser.version(), checks,
    signalEvidence, audioContext: audioContextEvidence, actualMedia: { aPeak, channelSilent, masterSilent }, errors, warnings,
    humanListening: 'NOT RUN', physicalDeviceLatency: 'NOT RUN', offlineVenueReliability: 'NOT RUN' }, null, 2));
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, errors, warnings }, null, 2));
  throw error;
} finally { await browser.close(); server.closeAllConnections(); server.close(); }
