import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { verifySessionAudio } from './session-audio.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(kind)) throw new Error(`Unsupported DJAYVO_BROWSER: ${kind}`);
const output = await fs.mkdtemp(path.join(root, `renders/session-${kind}-`));
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
    const bytes = await fs.readFile(name === 'session-probe.js' ? path.join(root, 'apps/web/tests/session-probe.js') : path.join(publicRoot, name));
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' })[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await { chromium, webkit }[kind].launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(10000);
const errors = [], requests = [], checks = [], warnings = [];
let screenshot = false;
// Silence only the physical test output, downstream of the application's measured mix.
await context.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.historyCounts = []; window.sessionScores = [];
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', ({data}) => {
        if (data.type === 'complete') sessionScores.push(JSON.parse(new TextDecoder().decode(data.files.find(f => f.name.endsWith('.score.json')).bytes)));
      });
    }
    postMessage(data, transfer) {
      if (data?.style === 'call_response') window.historyCounts.push(data.recent.length);
      return super.postMessage(data, transfer);
    }
  };
  const Native = window.AudioContext || window.webkitAudioContext;
  window.AudioContext = class extends Native {
    constructor(options) { super(options); window.testAudioContext ||= this; }
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
  const NativeWorklet = window.AudioWorkletNode;
  window.AudioWorkletNode = class extends NativeWorklet {
    constructor(...args) { super(...args); window.testRack = this; }
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
  if (message.type() !== 'error') return;
  if (screenshot && kind === 'webkit' && message.text().startsWith('Refused to apply a stylesheet')) warnings.push(message.text());
  else errors.push(message.text());
});
const capture = async name => { screenshot = true; try { await page.screenshot({ path: path.join(output, name), fullPage: true }); } finally { screenshot = false; } };
page.on('request', request => requests.push(request.url()));
const check = name => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
try {
  await page.goto(`${origin}/dj.html`);
  assert.match(await page.title(), /Djayvo/);
  await page.locator('#performance-title').waitFor();
  assert.equal(await page.locator('#prepare-a').isDisabled(), true);
  assert.equal(await page.locator('#phrase-record').isDisabled(), true);
  check('identity, meaningful screen, permission-disabled preparation/capture');
  const timing = await verifySessionAudio(page);
  await fs.writeFile(path.join(output, 'timing.json'), JSON.stringify(timing, null, 2));
  check('C++/WASM absolute bar clock and real two-channel rendered A/C entry, zero A gaps at C entry');
  const rate = 48000, frames = rate * 90;
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) wav.writeInt16LE(Math.round(2200 * Math.sin(2 * Math.PI * 523.2512 * i / rate)), 44 + i * 2);
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles({ name: 'session-test-a.wav', mimeType: 'audio/wav', buffer: wav });
  await page.locator('#prepare-a').click();
  await page.waitForFunction(() => !document.getElementById('context-confirmed').disabled, null, { timeout: 30000 });
  assert.equal(await page.locator('#play-a').isDisabled(), true);
  assert.equal(await page.locator('#file-a').isDisabled(), true);
  assert.equal(await page.locator('#eq-a-0').isDisabled(), false);
  await page.locator('#session-bpm').fill('120'); await page.locator('#session-bpm').dispatchEvent('change');
  await page.locator('#session-key').selectOption('60');
  await page.locator('#session-mode').selectOption('major');
  await page.locator('#context-confirmed').check();
  await page.locator('#session-play').click();
  await page.waitForFunction(() => !document.getElementById('session-stop').disabled);
  const heardA = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 300));
    const samples = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  });
  assert.ok(heardA > .01);
  assert.equal(await page.locator('#tone-a').isDisabled(), false);
  await page.locator('#tone-a').fill('0'); await page.locator('#tone-a').dispatchEvent('input');
  await page.waitForTimeout(150);
  const darkA = await page.evaluate(() => {
    const samples = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  });
  assert.ok(darkA < heardA * .85, `${darkA} / ${heardA}`);
  await page.locator('#fx-reset-a').click();
  assert.equal(await page.locator('#state-a').textContent(), 'Prepared · playing');
  check('prepared A locks conflicting transport, preserves EQ/effects and tone changes actual audio without stopping transport');
  await page.evaluate(async () => {
    await testAudioContext.audioWorklet.addModule('./session-probe.js');
    window.probe = new AudioWorkletNode(testAudioContext, 'continuity-probe');
    const mute = testAudioContext.createGain(); mute.gain.value = 0;
    testMeter.connect(probe); probe.connect(mute); mute.connect(testAudioContext.destination);
    await new Promise(r => setTimeout(r, 200)); probe.port.postMessage('start');
  });
  await page.locator('#phrase-consent').check();
  await page.locator('#phrase-file').setInputFiles(path.join(root, 'renders/voice-20261017-221411/source-pcm.wav'));
  await page.waitForFunction(() => !document.getElementById('phrase-generate').disabled);
  const generationBegan = performance.now();
  await page.locator('#phrase-generate').click();
  await page.waitForFunction(() => !document.getElementById('performance-download').hidden || document.getElementById('performance-error').textContent, null, { timeout: 120000 });
  assert.equal(await page.locator('#performance-error').innerText(), '');
  const generationSeconds = (performance.now() - generationBegan) / 1000;
  const majorScore = await page.evaluate(() => sessionScores[0]);
  assert.deepEqual(majorScore.key, { tonic_midi: 60, mode: 'major' });
  assert.equal(majorScore.schema_version, '1.7-remix');
  for (const track of majorScore.tracks) if (track.instrument !== 'drums') for (const event of track.events)
    assert.ok([0,2,4,5,7,9,11].includes((event.note - 60 + 120) % 12));
  assert.equal(await page.locator('#session-mode').isDisabled(), true);
  check('confirmed major mode reaches the shared planner; all pitched notes belong to its scale');
  const downloaded = page.waitForEvent('download');
  await page.locator('#performance-download').click();
  await (await downloaded).saveAs(path.join(output, 'consented-performance.wav'));
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  await page.locator('#c-arm').click();
  await page.waitForFunction(() => document.getElementById('performance-status').textContent.includes('A + C playing'), null, { timeout: 6000 });
  assert.equal(await page.locator('#c-stop').isDisabled(), false);
  check('consented phrase -> C++ context plan -> playable WAV -> bar-armed C while A continues');
  await page.waitForFunction(() => document.getElementById('c-stop').disabled, null, { timeout: 45000 });
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  assert.equal(await page.locator('#performance-status').innerText(), 'C stopped. A continues.');
  check('complete C performance ends naturally with accurate status while A keeps playing');
  await page.locator('#c-arm').click();
  await page.waitForFunction(() => document.getElementById('performance-status').textContent.includes('A + C playing'), null, { timeout: 6000 });
  await page.locator('#c-level').fill('0'); await page.locator('#c-level').dispatchEvent('input');
  assert.equal(await page.locator('#c-level-value').innerText(), '0%');
  await page.locator('#c-stop').click();
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  check('C manual fader/stop do not stop A');
  await page.locator('#phrase-generate').click(); await page.locator('#phrase-cancel').click();
  assert.equal(await page.locator('#performance-download').isVisible(), true);
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  assert.deepEqual(await page.evaluate(() => historyCounts), [0, 1]);
  check('worker cancellation retains ready C and uninterrupted A; next request excludes recent composition');
  // Reject optional preparation without corrupting the active session.
  await page.route('**/engine-worker.js', route => route.abort());
  await page.locator('#phrase-generate').click();
  await page.waitForFunction(() => document.getElementById('performance-error').textContent.includes('director'));
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  assert.equal(await page.locator('#performance-download').isVisible(), true);
  await page.unroute('**/engine-worker.js');
  check('director load failure leaves A and previous ready C intact');
  const continuity = await page.evaluate(() => new Promise(resolve => { probe.port.onmessage = ({ data }) => resolve(data); probe.port.postMessage('report'); }));
  assert.ok(continuity.blocks > 100); assert.equal(continuity.silent, 0); assert.equal(continuity.frameGaps, 0);
  await fs.writeFile(path.join(output, 'continuity.json'), JSON.stringify(continuity, null, 2));
  check('measured callback continuity during generation, entry, cancellation and failed preparation');
  await page.locator('#phrase-file').setInputFiles({ name: 'empty.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(0) });
  await page.waitForFunction(() => document.getElementById('performance-error').textContent.includes('8 MB'));
  assert.equal(await page.locator('#performance-download').isVisible(), true);
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  check('rejected replacement phrase keeps previous source/performance and A playback');
  // Clear the expected network failure before checking unrelated console health.
  const expectedErrors = errors.splice(0);
  assert.ok(expectedErrors.every(e => /engine-worker|Failed to load|Load failed|aborted|access control/i.test(e)), expectedErrors.join('\n'));
  await page.locator('#performance').scrollIntoViewIfNeeded();
  await capture('desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#performance').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await capture('mobile.png');
  check('desktop/mobile visible controls and no horizontal overflow');
  await page.locator('#session-stop').click();
  await page.locator('#c-preview').click();
  await page.waitForFunction(() => document.getElementById('performance-status').textContent.includes('Previewing C'));
  await page.locator('#session-play').click();
  assert.equal(await page.locator('#c-stop').isDisabled(), true);
  check('C preview routes through performance gain, and restarting A cancels the preview');
  await page.locator('#session-stop').click();
  await page.locator('#session-mode').selectOption('minor');
  assert.equal(await page.locator('#context-confirmed').isChecked(), false);
  assert.equal(await page.locator('#performance-download').isVisible(), false);
  assert.equal(await page.locator('#c-preview').isDisabled(), true);
  await page.locator('#context-confirmed').check();
  await page.locator('#session-play').click();
  check('changing mode clears ready C and confirmation before playback can resume');
  // Synthetic microphone stream tests browser capture/lifecycle, not physical input.
  await page.evaluate(() => {
    window.originalCapture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async () => {
      const destination = testAudioContext.createMediaStreamDestination();
      const tone = testAudioContext.createOscillator(), gain = testAudioContext.createGain();
      tone.frequency.value = 220; gain.gain.value = .1; tone.connect(gain); gain.connect(destination); tone.start();
      tone.stop(testAudioContext.currentTime + 4);
      window.captureTracks = destination.stream.getTracks();
      return destination.stream;
    };
  });
  await page.locator('#phrase-record').click();
  await page.waitForFunction(() => document.getElementById('phrase-record').textContent.includes('Stop recording'));
  await page.waitForTimeout(2400);
  await page.locator('#phrase-record').click();
  await page.waitForFunction(() => document.getElementById('phrase-status').textContent.includes('phrase ready'));
  assert.equal(await page.evaluate(() => captureTracks.every(t => t.readyState === 'ended')), true);
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  check('synthetic microphone capture, decoding and track cleanup while A continues');
  await page.locator('#phrase-consent').uncheck();
  assert.equal(await page.locator('#performance-download').isVisible(), false);
  assert.equal(await page.locator('#phrase-generate').isDisabled(), true);
  assert.equal(await page.locator('#session-stop').isDisabled(), false);
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.resolveCapture = resolve; }); });
  await page.locator('#phrase-consent').check(); await page.locator('#phrase-record').click();
  await page.waitForFunction(() => !!window.resolveCapture);
  await page.locator('#phrase-consent').uncheck();
  await page.evaluate(() => { const stream = testAudioContext.createMediaStreamDestination().stream; window.lateTracks = stream.getTracks(); resolveCapture(stream); });
  await page.waitForFunction(() => lateTracks.every(t => t.readyState === 'ended'));
  assert.equal(await page.locator('#phrase-generate').isDisabled(), true);
  check('revoked consent rejects late microphone permission and closes its tracks');
  await page.locator('#music-rights').uncheck();
  assert.equal(await page.locator('#session-stop').isDisabled(), true);
  assert.equal(await page.locator('#session-play').isDisabled(), true);
  check('separate phrase and music consent withdrawal clears owned audio and scheduled entry');
  await page.evaluate(async () => { await navigator.serviceWorker.register('./service-worker.js'); await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  const requestsBeforeDisconnect = serverRequests.length;
  await page.reload();
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles({ name: 'prepared-offline.wav', mimeType: 'audio/wav', buffer: wav });
  await page.locator('#prepare-a').click();
  await page.waitForFunction(() => !document.getElementById('context-confirmed').disabled, null, { timeout: 30000 });
  await page.locator('#session-bpm').fill('120'); await page.locator('#session-bpm').dispatchEvent('change');
  await page.locator('#session-key').selectOption('60'); await page.locator('#session-mode').selectOption('minor'); await page.locator('#context-confirmed').check();
  await page.locator('#session-play').click();
  await page.locator('#phrase-consent').check();
  await page.locator('#phrase-file').setInputFiles(path.join(root, 'renders/voice-20261017-221411/source-pcm.wav'));
  await page.waitForFunction(() => !document.getElementById('phrase-generate').disabled);
  await page.locator('#phrase-generate').click();
  await page.waitForFunction(() => !document.getElementById('performance-download').hidden || document.getElementById('performance-error').textContent, null, { timeout: 120000 });
  assert.equal(await page.locator('#performance-error').innerText(), '');
  await page.locator('#c-arm').click();
  await page.waitForFunction(() => document.getElementById('performance-status').textContent.includes('A + C playing'), null, { timeout: 6000 });
  assert.equal(serverRequests.length, requestsBeforeDisconnect);
  assert.equal(await page.evaluate(() => sessionScores[0].key.mode), 'minor');
  check('server disconnected: reload, local track analysis, minor rule generation and synchronized C all work');
  assert.deepEqual(errors, []);
  assert.ok(requests.every(url => url.startsWith(origin) || url.startsWith('blob:')));
  check('no uploads, external requests or unexpected runtime errors');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', browser: kind, version: browser.version(), checks, timing, continuity, generationSeconds, heardA, expectedErrors, errors, warnings, physical_microphone: 'NOT RUN', listening: 'NOT RUN' }, null, 2));
} catch (error) {
  console.error(await page.locator('#performance-error').innerText().catch(() => 'page unavailable'));
  await page.screenshot({ path: path.join(output, 'failure.png'), timeout: 2000 }).catch(() => {});
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
