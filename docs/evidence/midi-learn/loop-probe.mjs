import { webkit } from '../../../apps/web/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await webkit.launch(), page = await browser.newPage();
await page.addInitScript(() => {
  const Native = AudioContext;
  window.AudioContext = class extends Native {
    createAnalyser() {
      const node = super.createAnalyser(), connect = node.connect.bind(node);
      node.connect = destination => { if (destination === this.destination) { const mute = this.createGain(); mute.gain.value = 0; connect(mute); mute.connect(destination); return destination; } return connect(destination); }; return node;
    }
  };
});
const report = { browser: browser.version(), iterations: [], errors: [] };
page.on('pageerror', e => report.errors.push(e.message));
try {
  await page.goto('http://localhost:3000/studio/dj.html');
  const rate = 48000, frames = rate * 60, data = Buffer.alloc(44 + frames * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) data.writeInt16LE(Math.round(8192 * Math.sin(2 * Math.PI * 220 * i / rate)), 44 + i * 2);
  await page.locator('#music-rights').check(); await page.locator('#file-a').setInputFiles({ name: 'probe.wav', mimeType: 'audio/wav', buffer: data });
  await page.waitForFunction(() => !document.getElementById('play-a').disabled); await page.locator('#play-a').click(); await page.waitForTimeout(200); await page.locator('#play-a').click();
  await page.locator('#loop-a').click();
  for (let i = 0; i < 20; i++) {
    assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), true);
    for (const value of ['1.1', '1', '1.1']) { await page.locator('#rate-a').fill(value); await page.locator('#rate-a').dispatchEvent('input'); }
    await page.locator('#seek-a').fill('59.9'); await page.locator('#seek-a').dispatchEvent('input');
    await page.waitForFunction(() => document.getElementById('audio-a').currentTime > 59 && !document.getElementById('audio-a').seeking);
    await page.locator('#play-a').click();
    await page.waitForFunction(() => { const a = document.getElementById('audio-a'); return a.currentTime < 2 && !a.paused && !a.seeking; }, null, { timeout: 10000 });
    report.iterations.push({ iteration: i + 1, status: 'PASS', position: await page.locator('#audio-a').evaluate(a => a.currentTime) });
    await page.locator('#play-a').click();
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = error.message; }
finally { await fs.writeFile('/tmp/djayvo-loop-probe.json', JSON.stringify(report, null, 2)); await browser.close(); }
console.log(report.status, report.iterations.length);

if (report.status !== 'PASS') process.exitCode = 1;
