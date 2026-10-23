import {revealStudioTools} from './studio-tools.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { verifyInstrumentFX } from './instrument-fx.mjs';
import { fakeMidi, verifyMidi } from './midi-browser.mjs';
import { sha256 } from '../live-take.js';
import { validateMixSources } from '../mix-sources.js';
import { validateMixAutomation } from '../mix-automation.js';
import { validateMixRecording } from '../mix-recording.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = (process.env.JAMLOOM_BROWSER ?? process.env.DJAYVO_BROWSER) || 'chromium';
if (!['chromium', 'webkit'].includes(kind)) throw new Error(`Unsupported JAMLOOM_BROWSER: ${kind}`);
const output = await fs.mkdtemp(path.join(root, `renders/dj-${kind}-`));
console.log('Artifacts:', output);
const publicRoot = path.join(root, 'dist/web');
const serverRequests = [];
const server = createServer(async (request, response) => {
  serverRequests.push(request.url);
  if(['/api/aurowall','/api/site-status'].includes(request.url)){
    response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(request.url==='/api/aurowall'?{tracks:[]}:{maintenance:false,announcement:null}));return;
  }
  const name = new URL(request.url, 'http://local').pathname.slice(1);
  if (request.method !== 'GET' || !/^[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').includes('..')) {
    response.writeHead(404); response.end(); return;
  }
  try {
    const bytes = await fs.readFile(path.join(publicRoot, name));
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' })[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await { chromium, webkit }[kind].launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
// This static/offline DSP harness has no account API; full-site tests cover these integrations.
await context.route('**/api/aurowall',route=>route.fulfill({json:{tracks:[]}}));
await context.route('**/api/site-status',route=>route.fulfill({json:{maintenance:false,announcement:null}}));
context.setDefaultTimeout(10000);
const errors = [], requests = [], checks = [], warnings = [], errorLocations=[];
let screenshot = false,disconnected=false;
// Silence only the physical test output, downstream of the application's measured mix.
await context.addInitScript(() => {
  const Native = window.AudioContext || window.webkitAudioContext;
  window.AudioContext = class extends Native {
    constructor(options) { super(options); window.testAudioContext = this; }
    createMediaElementSource(audio) {
      if (audio.hasAttribute('src')) console.error('Deck source was loaded before connecting the mixer');
      return super.createMediaElementSource(audio);
    }
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
await context.addInitScript(fakeMidi);
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') {
    if(disconnected&&['/api/aurowall','/api/site-status'].some(path=>message.location().url===origin+path)&&message.text().startsWith('Failed to load resource:'))warnings.push('Expected offline API failure: '+message.location().url);
    else if (screenshot && kind === 'webkit' && message.text().startsWith('Refused to apply a stylesheet')) warnings.push(message.text());
    else { errors.push(message.text());errorLocations.push(message.location()); }
  }
});
context.on('request', request => requests.push({ url: request.url(), method: request.method() }));
const check = name => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
const set = async (id, value) => {
  const control = page.locator(id), disclosure = control.locator('xpath=ancestor::details');
  for (const panel of await disclosure.all()) if (!await panel.evaluate(e => e.open)) await panel.locator(':scope > summary').click();
  await control.fill(String(value)); await control.dispatchEvent('input');
};
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
let signalEvidence, fxEvidence, deckFXEvidence;
try {
  await page.goto(`${origin}/dj.html`);await revealStudioTools(page);
  for (const deck of ['a','b']) await page.locator(`.deck-${deck} .deck-fx-panel summary`).click();
  assert.match(await page.title(), /Jamloom Pro — Performance Studio/);
  await page.getByRole('heading', { name: 'Performance studio' }).waitFor();
  await page.waitForFunction(()=>!document.getElementById('file-a').disabled);
  assert.equal(await page.locator('#file-a').isDisabled(), false);
  assert.equal(await page.locator('#play-a').isDisabled(), true);
  assert.deepEqual(await page.locator('#audio-a, #audio-b').evaluateAll(nodes => nodes.map(audio => audio.preload)), ['metadata', 'metadata']);
  check('page identity, nonblank content, immediate local-track loading');
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
  fxEvidence = await verifyInstrumentFX(page, output);
  check('instrument FX stereo PCM: dry identity, echo frames/decay, low-pass attenuation, mute/reset and playable piano WAVs');
  deckFXEvidence = [await verifyInstrumentFX(page, output, 0), await verifyInstrumentFX(page, output, 1)];
  check('both deck strips: dry identity, stereo tone/echo PCM, exact echo frames, mute/reset, cleared buffers and playable piano WAVs');
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.locator('#file-b').setInputFiles(b);
  await page.waitForFunction(() => !document.querySelector('#play-b').disabled);
  await page.evaluate(() => {
    const audio = document.querySelector('#audio-a'), play = audio.play.bind(audio);
    window.metadataPlayCalls = 0;
    Object.defineProperty(audio, 'readyState', { configurable: true, get: () => 0 });
    audio.play = () => { window.metadataPlayCalls++; return play(); };
  });
  await page.locator('#play-a').click(); await page.waitForTimeout(150);
  assert.equal(await page.locator('#state-a').textContent(), 'Starting…');
  assert.equal(await page.evaluate(() => window.metadataPlayCalls), 0);
  await page.evaluate(() => { delete document.querySelector('#audio-a').readyState; });
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && document.querySelector('#audio-a').currentTime > .05);
  assert.equal(await page.evaluate(() => window.metadataPlayCalls), 1);
  await page.locator('#play-a').click();
  await page.evaluate(() => { delete document.querySelector('#audio-a').play; });
  check('manual Play waits for actual deck metadata, then starts once and advances');
  await page.evaluate(() => {
    const resume = testAudioContext.resume.bind(testAudioContext);
    testAudioContext.resume = () => {
      testAudioContext.resume = resume;
      return new Promise(resolve => { window.finishTimedOutResume = resolve; });
    };
  });
  await page.locator('#play-a').click();
  assert.equal(await page.locator('#state-a').textContent(), 'Starting…');
  await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('Audio did not wake up'), null, { timeout: 15000 });
  assert.equal(await page.locator('#play-a').isDisabled(), false);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), true);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && !document.querySelector('#audio-a').paused);
  await page.evaluate(() => finishTimedOutResume()); await page.waitForTimeout(100);
  assert.equal(await page.locator('#error-a').textContent(), '');
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  await page.locator('#play-a').click();
  check('hung audio resume reports failure, restores manual Play and cannot disrupt a successful retry');
  await page.evaluate(() => {
    const audio = document.querySelector('#audio-a'), play = audio.play.bind(audio);
    audio.play = () => { audio.play = play; return play().then(() => new Promise(resolve => { window.finishOldPlay = resolve; })); };
  });
  await page.locator('#play-a').click();
  await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > .2 && !!window.finishOldPlay);
  await page.locator('#pause-all').click(); await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && !document.querySelector('#audio-a').paused);
  await page.evaluate(() => window.finishOldPlay()); await page.waitForTimeout(100);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  check('late completion of an older play request cannot pause a newer playback request');
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
  await set('#echo-a', .35); await set('#tone-a', 40);
  await page.locator('#file-a').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('invalid audio') });
  await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('Previous track kept'));
  assert.equal(await page.locator('#name-a').textContent(), a.name);
  assert.equal(await page.locator('#audio-b').evaluate(audio => audio.paused), false);
  assert.equal(await page.locator('#echo-a').inputValue(), '0.35');
  assert.equal(await page.locator('#tone-a').inputValue(), '40');
  await page.locator('#fx-reset-a').click();
  check('pause/seek one deck and reject corrupt replacement while other deck continues, preserving effects');
  const bBeforeStall = await page.locator('#audio-b').evaluate(audio => audio.currentTime);
  await page.evaluate(() => {
    const audio = document.querySelector('#audio-a'); window.realPlayA = audio.play.bind(audio);
    audio.play = () => Promise.resolve();
  });
  await page.locator('#play-a').click();
  assert.equal(await page.locator('#state-a').textContent(), 'Starting…');
  assert.equal(await page.locator('#play-a').isDisabled(), true);
  assert.equal(await page.locator('#pause-all').isDisabled(), false);
  await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('did not begin playing'), null, { timeout: 15000 });
  assert.equal(await page.locator('#play-a').isDisabled(), false);
  assert.equal(await page.locator('#file-a').isDisabled(), false);
  assert.equal(await page.locator('#state-a').textContent(), 'Ready');
  assert.ok(await page.locator('#audio-b').evaluate(audio => audio.currentTime) > bBeforeStall + 5);
  assert.ok(await peak() > .01);
  check('resolved-but-stalled A start reports failure and restores controls while B keeps producing audio');
  await capture('playback-start-failure.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('playback-start-failure-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.querySelector('#audio-a').play = () => new Promise((_, reject) => { window.rejectStaleStart = reject; });
  });
  await page.locator('#play-a').click();
  await page.waitForFunction(() => !!window.rejectStaleStart);
  await page.locator('#pause-all').click();
  assert.equal(await page.locator('#play-a').isDisabled(), false);
  await page.evaluate(() => { document.querySelector('#audio-a').play = window.realPlayA; });
  await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && !document.querySelector('#audio-a').paused);
  await page.evaluate(() => window.rejectStaleStart(new Error('cancelled old start')));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  assert.equal(await page.locator('#error-a').textContent(), '');
  await page.locator('#play-a').click(); await page.locator('#play-b').click();
  check('Pause All cancels an unresolved start; late rejection cannot pause or overwrite a successful retry');
  await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && !document.querySelector('#audio-a').paused);
  const rotation = await page.locator('#vinyl-a').evaluate(node => node.style.transform);
  await page.waitForFunction(rotation => document.querySelector('#vinyl-a').style.transform !== rotation, rotation);
  await page.locator('#play-a').click();
  await set('#seek-a', 8); await page.locator('#set-cue-a').click();
  await set('#seek-a', 15); await page.locator('#cue-a').click();
  assert.ok(Math.abs(await page.locator('#audio-a').evaluate(a => a.currentTime) - 8) < .2);
  await page.locator('#hot-a-0').click(); await set('#seek-a', 20); await page.locator('#hot-a-0').click();
  assert.ok(Math.abs(await page.locator('#audio-a').evaluate(a => a.currentTime) - 8) < .2);
  await page.locator('#hot-a-0').click({ modifiers: ['Shift'] });
  assert.match(await page.locator('#hot-a-0').textContent(), /EMPTY/);
  await page.locator('#jog-a').focus(); await page.keyboard.press('Shift+ArrowRight');
  assert.ok(Math.abs(await page.locator('#audio-a').evaluate(a => a.currentTime) - 9) < .2);
  const jog = await page.locator('#jog-a').boundingBox();
  await page.mouse.move(jog.x + jog.width / 2, jog.y + 10); await page.mouse.down();
  await page.mouse.move(jog.x + jog.width - 10, jog.y + jog.height / 2, { steps: 8 }); await page.mouse.up();
  assert.ok(Math.abs(await page.locator('#audio-a').evaluate(a => a.currentTime) - 9.45) < .2);
  await set('#rate-a', 1.1); assert.equal(await page.locator('#audio-a').evaluate(a => a.playbackRate), 1.1);
  await page.locator('#rate-reset-a').click();
  await page.locator('#bpm-a').fill('100'); await page.locator('#bpm-b').fill('110');
  await page.locator('#match-a').click(); assert.equal(await page.locator('#audio-a').evaluate(a => a.playbackRate), 1.1);
  await page.locator('#bpm-b').fill('200'); await page.locator('#match-a').click();
  assert.match(await page.locator('#error-a').textContent(), /exceeds/);
  await page.locator('#tap-a').click(); await page.waitForTimeout(450); await page.locator('#tap-a').click();
  assert.ok(Number(await page.locator('#bpm-a').inputValue()) > 40);
  await page.locator('#keylock-a').uncheck(); assert.equal(await page.locator('#audio-a').evaluate(a => a.preservesPitch), false);
  await page.locator('#keylock-a').check();
  await page.locator('#loop-a').click(); assert.equal(await page.locator('#loop-a').getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => {
    window.loopTrace = [];
    const audio = document.getElementById('audio-a');
    for (const type of ['play', 'playing', 'pause', 'ended', 'seeking', 'seeked', 'error']) audio.addEventListener(type, () => {
      loopTrace.push({ type, time: audio.currentTime, paused: audio.paused, ended: audio.ended, rate: audio.playbackRate });
      if (loopTrace.length > 40) loopTrace.shift();
    });
  });
  await set('#seek-a', 59.9);
  await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > 59 && !document.querySelector('#audio-a').seeking);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > .05 && document.querySelector('#audio-a').currentTime < 2 && !document.querySelector('#audio-a').paused && !document.querySelector('#audio-a').seeking);
  await page.locator('#loop-a').click(); await page.locator('#rate-reset-a').click();
  check('rotating platter, pointer/keyboard jog, cue/hot-cue, pitch/reset, tempo/tap, key lock and actual track looping');
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  const beforeRate = await page.locator('#audio-a').evaluate(audio => audio.currentTime);
  await page.evaluate(() => {
    const rate = document.querySelector('#rate-a');
    for (const value of ['1.04', '1.08']) { rate.value = value; rate.dispatchEvent(new Event('input')); }
  });
  await page.waitForFunction(before => document.querySelector('#audio-a').currentTime > before + .05 && document.querySelector('#audio-a').playbackRate === 1.08 && !document.querySelector('#play-a').disabled, beforeRate);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.playbackRate), 1.08);
  assert.ok(await peak() > .01);
  await page.evaluate(() => {
    const rate = document.querySelector('#rate-a'); rate.value = '1.12'; rate.dispatchEvent(new Event('input'));
    document.querySelector('#pause-all').click();
  });
  await page.waitForTimeout(100);
  assert.deepEqual(await page.locator('#audio-a, #audio-b').evaluateAll(nodes => nodes.map(audio => audio.paused)), [true, true]);
  await page.locator('#play-a').click(); await page.locator('#play-b').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.evaluate(() => {
    const rate = document.querySelector('#rate-a'); rate.value = '1.06'; rate.dispatchEvent(new Event('input'));
    document.querySelector('#clear-a').click();
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#audio-a').getAttribute('src'), null);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), true);
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await page.locator('#play-a').click();
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled && document.querySelector('#audio-a').currentTime > .05);
  check('rapid active pitch changes keep the latest rate; Pause All and unload cancel the queued resume, then reload plays');
  await set('#crossfade', 0); await page.waitForTimeout(150);
  const eqFlat = await (await page.waitForFunction(() => {
    const values = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(values);
    const level = Math.max(...values.map(Math.abs)); return level > .1 ? level : false;
  }, null, { timeout: 5000 })).jsonValue();
  await set('#eq-a-0', -12);
  await page.waitForFunction(flat => {
    const values = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(values);
    const level = Math.max(...values.map(Math.abs)); return level > .001 && level < flat * .8;
  }, eqFlat, { timeout: 5000 });
  await set('#eq-a-0', 0);
  check('deck low EQ changes measured output');
  for (const [id, crossfade] of [['a', 0], ['b', 1]]) {
    await set('#crossfade', crossfade); await set(`#tone-${id}`, 0); await page.waitForTimeout(200);
    const dark = await peak();
    await set(`#tone-${id}`, 100); await page.waitForTimeout(200);
    const bright = await peak();
    assert.ok(bright > dark * 1.05, `${id}: ${bright} / ${dark}`);
    await set(`#echo-${id}`, .5); await set(`#delay-${id}`, 800); await page.waitForTimeout(900);
    await page.locator(`#play-${id}`).click(); await page.waitForTimeout(250);
    assert.ok(await peak() > .001, `${id} echo continues after pause`);
    await set(`#level-${id}`, 0); await page.waitForTimeout(150); assert.ok(await peak() < .0001);
    await set(`#level-${id}`, 1); await page.waitForTimeout(150); assert.ok(await peak() > .001);
    await set('#master', 0); await page.waitForTimeout(150); assert.ok(await peak() < .0001);
    await set('#master', .75); await set('#crossfade', 1 - crossfade);
    await set(`#level-${id === 'a' ? 'b' : 'a'}`, 0);
    await page.waitForTimeout(150); assert.ok(await peak() < .0001);
    await set('#crossfade', crossfade); await page.locator(`#fx-reset-${id}`).click();
    await set(`#echo-${id}`, .5); await page.waitForTimeout(150);
    assert.ok(await peak() < .0001, 'reset cannot revive an old delay buffer');
    await page.locator(`#fx-reset-${id}`).click();
    await set(`#level-${id === 'a' ? 'b' : 'a'}`, 1);
    await page.locator(`#play-${id}`).click();
  }
  await set('#crossfade', 0);
  check('A/B controls change real audio independently; pause tails follow channel/master/crossfader and reset cannot revive old audio');
  await page.evaluate(() => {
    const resume = testAudioContext.resume.bind(testAudioContext);
    testAudioContext.resume = () => {
      testAudioContext.resume = resume;
      return new Promise(resolve => { window.finishRackResume = resolve; });
    };
  });
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => document.querySelector('#instrument-status').textContent.includes('Audio did not wake up'), null, { timeout: 15000 });
  assert.equal(await page.locator('#load-instruments').isDisabled(), false);
  assert.equal(await page.locator('.piano-key').first().isDisabled(), true);
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => document.querySelector('#instrument-status').textContent.startsWith('Ready'), null, { timeout: 30000 });
  await page.evaluate(() => finishRackResume()); await page.waitForTimeout(100);
  assert.match(await page.locator('#instrument-status').textContent(), /^Ready/);
  check('hung instrument wake-up restores Prepare; retry succeeds and late completion stays inert');
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), false);
  assert.equal(await page.locator('.piano-key').count(), 88);
  assert.equal(await page.locator('.drum-pad').count(), 12);
  await set('#level-a', 0); await set('#level-b', 0); await page.waitForTimeout(200);
  await page.locator('#patch').selectOption('6'); await page.locator('.keyboard-scroll').focus();
  await page.keyboard.down('a'); await page.keyboard.down('d'); await page.keyboard.down('g');
  await page.waitForFunction(() => document.querySelector('#output-meter').value > .001);
  assert.equal(await page.locator('.piano-key[aria-pressed=true]').count(), 3);
  await page.keyboard.up('a'); await page.keyboard.up('d'); await page.keyboard.up('g');
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('live shared-C++ AudioWorklet instruments produce chord audio while decks keep advancing; release clears sound');
  await page.evaluate(() => {
    const resume = testAudioContext.resume.bind(testAudioContext);
    Object.defineProperty(testAudioContext, 'state', { configurable: true, value: 'suspended' });
    testAudioContext.resume = () => {
      delete testAudioContext.state; testAudioContext.resume = resume;
      return new Promise((_, reject) => { window.rejectOldNoteResume = reject; });
    };
  });
  await page.keyboard.down('a'); await page.keyboard.up('a'); await page.keyboard.down('a');
  await page.waitForFunction(() => document.querySelector('#output-meter').value > .001);
  const readyStatus = await page.locator('#instrument-status').textContent();
  await page.evaluate(() => rejectOldNoteResume(new Error('Old note wake-up failed'))); await page.waitForTimeout(100);
  assert.equal(await page.locator('.piano-key[aria-pressed=true]').count(), 1);
  assert.equal(await page.locator('#instrument-status').textContent(), readyStatus);
  assert.ok(await peak() > .001);
  await page.keyboard.up('a'); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('late note wake-up rejection cannot release or overwrite a newer note on the same key');
  await page.locator('#sustain').click(); await page.locator('.keyboard-scroll').focus();
  await page.keyboard.press('a'); await page.waitForTimeout(500); assert.ok(await peak() > .001);
  await set('#master', 0); await page.waitForTimeout(200); assert.ok(await peak() < .0001);
  await set('#master', .75); await page.waitForTimeout(200); assert.ok(await peak() > .001);
  await set('#rack-level', 0); await page.waitForTimeout(200); assert.ok(await peak() < .0001);
  await set('#rack-level', .65); await page.locator('#sustain').click();
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(100); await page.locator('#panic').click(); await page.keyboard.up('a');
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.keyboard.up('a');
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), false);
  check('sustain, instrument/master mute, panic and blur release work without pausing decks');
  await set('#rack-echo', .5); await set('#rack-delay', 800); await set('#rack-tone', 0);
  assert.equal(await page.locator('#rack-tone-value').textContent(), '200 Hz');
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('k');
  await page.waitForTimeout(300); const dark = await peak();
  await set('#rack-tone', 100); await page.waitForTimeout(200); const bright = await peak();
  assert.ok(bright > dark * 2, `${bright} vs ${dark}`);
  await page.keyboard.up('k'); await page.waitForTimeout(1200); assert.ok(await peak() > .0001);
  await set('#rack-level', 0); await page.waitForTimeout(200); assert.ok(await peak() < .0001);
  await set('#rack-level', .65); await set('#master', 0); await page.waitForTimeout(200); assert.ok(await peak() < .0001);
  await set('#master', .75); await page.locator('#rack-fx-reset').click();
  await page.waitForTimeout(300); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#rack-echo-value').textContent(), 'Off');
  assert.equal(await page.locator('#rack-delay-value').textContent(), '300 ms');
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), false);
  await set('#rack-echo', .5); await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  await page.locator('#rack-fx-reset').click();
  check('live tone/echo controls change instrument audio; level/master silence tails; reset clears buffers even if echo is raised again, decks continue');
  await page.locator('#patch').selectOption('11');
  assert.match(await page.locator('#octave-name').textContent(), /C2/);
  assert.equal(await page.locator('#mouth').isDisabled(), false);
  const centroid = () => page.evaluate(() => {
    testMeter.smoothingTimeConstant = 0;
    const values = new Float32Array(testMeter.frequencyBinCount); testMeter.getFloatFrequencyData(values);
    let total = 0, weighted = 0;
    for (let i=1;i<values.length;i++) { const hz=i*testAudioContext.sampleRate/testMeter.fftSize; if(hz>4000) break; const power=10**(values[i]/10);total+=power;weighted+=power*hz; }
    return weighted/total;
  });
  await set('#mouth', 0); await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(500); const oo = await centroid();
  await set('#mouth', .5); await page.waitForTimeout(500); const ah = await centroid();
  await set('#mouth', 1); await page.waitForTimeout(500); const ee = await centroid();
  assert.ok(ah > oo + 100 && ah > ee + 100, `${oo} -> ${ah} -> ${ee}`);
  await page.keyboard.up('a'); await page.waitForTimeout(700); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), false);
  await page.locator('#patch').selectOption('0'); assert.equal(await page.locator('#mouth').isDisabled(), true);
  await page.locator('#octave-up').click(); await page.locator('#octave-up').click();
  for (const name of ['Clap', 'Rimshot', 'Low tom', 'Shaker']) {
    const pad = page.getByRole('button', {name: `${name} PERCUSSION`});
    await pad.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(35);
    assert.ok(await peak() > .00001, name);
    await page.keyboard.up('Space'); await page.waitForTimeout(250);
  }
  check('talk-bass low register and live vowel spectrum, release, isolated controls and four new percussion sounds');
  await page.locator('#octave-up').click(); assert.match(await page.locator('#octave-name').textContent(), /C5/);
  await page.locator('#octave-down').click();
  await page.locator('#patch').selectOption('4');
  assert.equal(await page.locator('[data-pitch="21"]').isDisabled(), true);
  assert.equal(await page.locator('[data-pitch="60"]').isDisabled(), false);
  await page.locator('#patch').selectOption('0');
  assert.equal(await page.locator('[data-pitch="21"]').isDisabled(), false);
  const pad = page.locator('.drum-pad').first(); await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForTimeout(80); assert.ok(await peak() > .0001); await page.mouse.up();
  await page.locator('#panic').click();
  check('octave selection, patch range limits and pointer drum pad generate real audio');
  await verifyMidi(page, check, peak);
  await set('#level-a', 1); await set('#level-b', 1); await set('#crossfade', .5);
  await capture('desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('.keyboard-scroll').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250); // Let the resized horizontal keyboard finish painting.
  assert.equal(await page.locator('[data-pitch="60"]').evaluate(key => {
    const r = key.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.bottom - 10) === key;
  }), true);
  await capture('mobile.png');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#vinyl-a').evaluate(node => getComputedStyle(node).transform), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('desktop, tablet and mobile controls render without horizontal overflow; reduced motion stops platter animation');
  await page.evaluate(() => window.testRack.dispatchEvent(new Event('processorerror')));
  await page.waitForFunction(() => document.querySelector('#instrument-status').textContent.includes('engine stopped'));
  assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), false);
  assert.equal(await page.locator('#patch').isDisabled(), true);
  assert.equal(await page.locator('#rack-echo').isDisabled(), true);
  check('injected instrument processor failure disables keys and preserves deck playback');
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
  await set('#echo-a', .5); await set('#delay-a', 800); await page.waitForTimeout(900);
  await page.locator('#clear-a').click();await page.locator('#clear-b').click();
  assert.equal(await page.locator('audio').evaluateAll(nodes => nodes.every(a => a.paused && !a.getAttribute('src'))), true);
  assert.equal(await page.locator('#play-b').isDisabled(), true);
  await page.waitForTimeout(150);
  assert.ok(Number(await page.locator('#output-meter').getAttribute('value')) < .0001);
  assert.equal(await page.locator('#echo-a').inputValue(), '0');
  assert.equal(await page.locator('#echo-a').isDisabled(), true);
  check('unloading stops and detaches both decks and clears effect tails and controls');
  // Prepare the same audited cache as the existing offline control, then reload disconnected.
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();await revealStudioTools(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // Match the existing offline runner: stop the real server. WebKit offline
  // emulation rejects some service-worker navigations before consulting cache.
  disconnected=true;server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  const requestsBeforeDisconnect = serverRequests.length;
  await page.reload();await revealStudioTools(page);
  await page.getByRole('heading', { name: 'Performance studio' }).waitFor();
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
  await set('#echo-a', .5); await set('#delay-a', 800); await page.waitForTimeout(900);
  await page.locator('#pause-all').click(); await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  await page.locator('#play-a').click(); await page.waitForTimeout(300);
  await page.locator('#clear-a').click();
  await page.locator('#file-a').setInputFiles(a);
  await page.waitForFunction(() => !document.querySelector('#play-a').disabled);
  await set('#echo-a', .5); await page.waitForTimeout(350); assert.ok(await peak() < .0001);
  await page.locator('#fx-reset-a').click();
  check('disconnected reload: deck playback/effects, Pause all clears tails, unload/reload cannot revive old audio');
  await page.locator('#pause-all').click();
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => document.querySelector('#instrument-status').textContent.startsWith('Ready'));
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForFunction(() => document.querySelector('#output-meter').value > .001);
  await set('#rack-echo', .4); assert.equal(await page.locator('#rack-echo-value').textContent(), '40%');
  await page.keyboard.up('a'); await page.locator('#panic').click();
  assert.equal(serverRequests.length, requestsBeforeDisconnect);
  check('cached WASM bank and AudioWorklet produce instrument audio with server disconnected');
  await page.locator('#rack-fx-reset').click();
  await page.locator('#patch').selectOption('6');
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await page.locator('#midi-enable').click(); await page.locator('#midi-input').selectOption('one');
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
  await page.locator('#midi-target').selectOption('rack-level'); await page.locator('#midi-learn').click();
  await page.evaluate(() => midiPorts[0].emit([0xb0, 7, 0]));
  await page.evaluate(() => midiPorts[0].emit([0x90, 60, 100]));
  await page.waitForFunction(() => document.getElementById('output-meter').value > .001);
  await page.evaluate(() => { midiPorts[0].emit([0xb0, 7, 83]); midiPorts[0].emit([0xb0, 7, 0]); });
  await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  await page.evaluate(() => midiPorts[0].emit([0xb0, 7, 127]));
  await page.waitForFunction(() => document.getElementById('output-meter').value > .001);
  await page.locator('#midi-enable').click();
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  assert.equal(serverRequests.length, requestsBeforeDisconnect);
  assert.equal(await page.locator('#midi-bindings li').count(), 0);
  check('cached MIDI Learn picks up, mutes/unmutes actual instrument PCM and clears on disable with server disconnected (synthetic port)');
  await page.locator('#mix-record-consent').check(); await page.locator('#mix-record-start').click();
  await page.waitForFunction(() => !document.getElementById('mix-record-stop').disabled);
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(200); await page.keyboard.up('a'); await page.waitForTimeout(150);
  await page.locator('#rack-level').fill('0.6'); await page.locator('#rack-level').dispatchEvent('input');
  await page.locator('#rack-echo').fill('0.3'); await page.locator('#rack-echo').dispatchEvent('input');
  await page.locator('#rack-fx-reset').click();
  await page.locator('#mix-record-stop').click(); await page.locator('#mix-record-wav').waitFor({state:'visible'});
  for (const [id,name] of [['mix-record-wav','offline-mix.wav'],['mix-record-json','offline-mix.json'],['mix-record-automation','offline-controls.json'],['mix-record-sources','offline-sources.json']]) {
    const promise=page.waitForEvent('download'); await page.locator(`#${id}`).click();
    await(await promise).saveAs(path.join(output,name));
  }
  const offlineReceipt=validateMixRecording(JSON.parse(await fs.readFile(path.join(output,'offline-mix.json'),'utf8')));
  const offlineControls=validateMixAutomation(JSON.parse(await fs.readFile(path.join(output,'offline-controls.json'),'utf8')),offlineReceipt);
  assert.ok(offlineControls.events.some(e=>e.target==='rack' && e.value>0));
  assert.ok(offlineControls.events.some(e=>e.target==='rack' && e.kind==='tone_echo' && e.echo===.3));
  assert.ok(offlineControls.events.some(e=>e.target==='rack' && e.kind==='clear_echo'));
  const offlineSources=validateMixSources(JSON.parse(await fs.readFile(path.join(output,'offline-sources.json'),'utf8')),offlineReceipt);
  assert.ok(offlineSources.assets.some(asset=>asset.kind==='instrument_engine'));
  const offlineWav=await fs.readFile(path.join(output,'offline-mix.wav'));
  assert.equal(await sha256(offlineWav),offlineReceipt.wav_sha256);
  let offlinePeak=0; for(let i=44;i<offlineWav.length;i+=2)offlinePeak=Math.max(offlinePeak,Math.abs(offlineWav.readInt16LE(i)));
  assert.ok(offlinePeak>32 && offlinePeak<32767);
  await page.locator('#mix-record-player').evaluate(audio=>audio.play());
  await page.waitForFunction(()=>document.getElementById('mix-record-player').currentTime>0);
  await page.locator('#mix-record-delete').click();
  assert.equal(serverRequests.length,requestsBeforeDisconnect);
  check('cached mix recorder captures, downloads and plays hash-verified PCM and gain/effect/reset automation plus source fingerprints with server disconnected');
  await page.locator('#clear-a').click();
  assert.equal(await page.locator('#audio-a').getAttribute('src'), null);
  check('unload releases the deck source');
  const audioContextEvidence = await page.evaluate(() => ({ sampleRate: testAudioContext.sampleRate, baseLatency: testAudioContext.baseLatency ?? null, outputLatency: testAudioContext.outputLatency ?? null, note: 'Browser-reported values, not hardware latency measurements' }));
  await page.reload();await revealStudioTools(page);
  await page.evaluate(() => { window.AudioContext.prototype.createGain = () => { throw new Error('Injected graph failure'); }; });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('#file-a').setInputFiles(a);
    await page.waitForFunction(() => document.querySelector('#error-a').textContent.includes('Mixer could not initialize'));
    await page.waitForFunction(() => !document.querySelector('#file-a').disabled);
    assert.equal(await page.locator('#play-a').isDisabled(), true);
    assert.equal(await page.locator('#audio-a').getAttribute('src'), null);
    assert.equal(await page.locator('#audio-a').evaluate(audio => audio.paused), true);
  }
  check('failed graph initialization rejects repeated loads before attaching audio; no unprocessed fallback');

  assert.equal(requests.some(r => r.method !== 'GET' || (!r.url.startsWith(`${origin}/`) && !r.url.startsWith(`blob:${origin}/`))), false);
  assert.deepEqual(errors, []);
  check('no upload/external request, URL-release errors or app console errors');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', browser: kind, version: browser.version(), checks,
    signalEvidence, fxEvidence, deckFXEvidence, audioContext: audioContextEvidence, actualMedia: { aPeak, channelSilent, masterSilent }, errors, warnings,
    humanListening: 'NOT RUN', physicalDeviceLatency: 'NOT RUN', offlineVenueReliability: 'NOT RUN' }, null, 2));
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, errors, warnings, errorLocations, state: await Promise.race([new Promise(resolve => setTimeout(() => resolve('Page unavailable after failure'), 2000)), page.evaluate(() => ({ instruments: document.querySelector('#instrument-status').textContent, loopTrace: window.loopTrace, deckError: document.getElementById('error-a').textContent, decks: [...document.querySelectorAll('audio')].map(a => ({time:a.currentTime,paused:a.paused,seeking:a.seeking,ended:a.ended,rate:a.playbackRate,readyState:a.readyState,networkState:a.networkState,error:a.error && {code:a.error.code,message:a.error.message}})), meter:document.querySelector('#output-meter').value })).catch(() => null)]) }, null, 2));
  throw error;
} finally { await browser.close(); server.closeAllConnections(); server.close(); }
