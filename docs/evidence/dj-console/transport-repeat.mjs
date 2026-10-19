// Run the local preview first: python3 scripts/web_serve.py
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { webkit } from '../../../apps/web/node_modules/playwright/index.mjs';
const browser = await webkit.launch();
const page = await browser.newPage();
page.setDefaultTimeout(10000);
await page.addInitScript(() => {
  const Native = AudioContext;
  window.AudioContext = class extends Native {
    constructor(options) { super(options); window.probeAudio = this; }
    createAnalyser() {
      const node = super.createAnalyser(), connect = node.connect.bind(node);
      node.connect = destination => {
        if (destination === this.destination) {
          const mute = this.createGain(); mute.gain.value = 0;
          connect(mute); mute.connect(destination); return destination;
        }
        return connect(destination);
      };
      return node;
    }
  };
});
const cycles = [];
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  const frames = 96000, wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) wav.writeInt16LE(Math.round(8192 * Math.sin(2 * Math.PI * 220 * i / 48000)), 44 + i * 2);
  await page.goto('http://localhost:4173/dj.html');
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles({ name: 'transport-probe.wav', mimeType: 'audio/wav', buffer: wav });
  await page.locator('#loop-a').click(); await page.locator('#play-a').click();
  for (let i = 0; i < 8; i++) {
    await page.locator('#seek-a').fill('1.9');
    await page.waitForFunction(() => { const a = document.querySelector('#audio-a'); return a.currentTime > .1 && a.currentTime < 1 && !a.paused && !a.seeking; });
    await page.locator('#rate-a').fill('1.1'); await page.locator('#rate-a').dispatchEvent('input');
    await page.locator('#rate-reset-a').click();
    await page.waitForFunction(() => document.querySelector('#audio-a').currentTime > .2 && document.querySelector('#output-meter').value > .1);
    cycles.push(await page.evaluate(() => ({ time: document.querySelector('#audio-a').currentTime, paused: document.querySelector('#audio-a').paused, rate: document.querySelector('#audio-a').playbackRate, peak: document.querySelector('#output-meter').value })));
    assert.equal(cycles.at(-1).paused, false); assert.equal(cycles.at(-1).rate, 1);
  }
  await page.route('**/engine/djayvo_live.wasm', route => route.fulfill({ status: 200, contentType: 'application/wasm', body: 'broken bank' }));
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => !document.querySelector('#load-instruments').disabled);
  assert.equal(await page.locator('#patch').isDisabled(), true);
  await page.waitForFunction(() => !document.querySelector('#audio-a').paused && document.querySelector('#output-meter').value > .1);
  await page.locator('#pause-all').click(); await page.waitForTimeout(250);
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), true);
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('./transport-repeat.json', import.meta.url), JSON.stringify({ status: 'PASS', browser: browser.version(), cycles, explicitPause: 'PASS', invalidBankPreservesDeck: 'PASS', errors, gaplessPlayback: 'NOT RUN', physicalLatency: 'NOT RUN' }, null, 2));
  console.log('PASS: eight WebKit loop/pitch/reset cycles, explicit pause and invalid-bank isolation');
} catch (error) {
  console.log({error:error.message,cycles,state:await page.evaluate(()=>({context:probeAudio.state,time:document.querySelector('#audio-a').currentTime,paused:document.querySelector('#audio-a').paused,meter:document.querySelector('#output-meter').value,ready:document.querySelector('#audio-a').readyState,status:document.querySelector('#error-a').textContent}))});
  throw error;
} finally { await browser.close(); }
