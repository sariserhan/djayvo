// Isolate native media seeking/restart from the DJ UI; generated tone only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'webkit';
assert.ok(['chromium', 'webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/media-restart-${kind}-`));
console.log('Artifacts:', output);
const rate = 48000, frames = rate * 60, tone = Buffer.alloc(44 + frames * 2);
tone.write('RIFF'); tone.writeUInt32LE(tone.length - 8, 4); tone.write('WAVEfmt ', 8);
tone.writeUInt32LE(16, 16); tone.writeUInt16LE(1, 20); tone.writeUInt16LE(1, 22);
tone.writeUInt32LE(rate, 24); tone.writeUInt32LE(rate * 2, 28);
tone.writeUInt16LE(2, 32); tone.writeUInt16LE(16, 34);
tone.write('data', 36); tone.writeUInt32LE(frames * 2, 40);
for (let i = 0; i < frames; i++) tone.writeInt16LE(Math.round(8192 * Math.sin(2 * Math.PI * 220 * i / rate)), 44 + i * 2);
const requests = [];
const server = createServer((request, response) => {
  if (request.url === '/tone.wav') {
    let start = 0, end = tone.length - 1;
    if (request.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      if (!match) { response.writeHead(416); response.end(); return; }
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
      if (start > end) { response.writeHead(416, { 'Content-Range': `bytes */${tone.length}` }); response.end(); return; }
    }
    const headers = { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 };
    if (request.headers.range) headers['Content-Range'] = `bytes ${start}-${end}/${tone.length}`;
    requests.push({ range: request.headers.range || null, start, end });
    response.writeHead(request.headers.range ? 206 : 200, headers); response.end(tone.subarray(start, end + 1));
  } else if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>Djayvo media restart diagnostic</title><h1>Media restart diagnostic</h1><input type="file" id="file"><button id="play">Start generated tone</button><audio id="audio"></audio>');
  } else { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = { browser: kind, runner: { node: process.version, platform: process.platform, architecture: process.arch },
  probe_sha256: crypto.createHash('sha256').update(await fs.readFile(fileURLToPath(import.meta.url))).digest('hex'), cases: [], requests };
try {
  browser = await { chromium, webkit }[kind].launch(); report.version = browser.version();
  for (const source of ['blob', 'file', 'input', 'http']) {
    const context = await browser.newContext(), page = await context.newPage();
    const row = { source, iterations: 0, errors: [], external: [] }; report.cases.push(row);
    page.on('pageerror', e => row.errors.push(e.message));
    context.on('request', request => {
      if (![origin + '/', 'blob:' + origin + '/'].some(prefix => request.url().startsWith(prefix)))
        row.external.push(request.url());
    });
    try {
      await page.goto(origin); assert.equal(await page.title(), 'Djayvo media restart diagnostic');
      await page.locator('h1').waitFor();
      if (source === 'input') await page.locator('#file').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: tone });
      await page.evaluate(async source => {
        const a = document.getElementById('audio'); window.a = a; window.events = []; window.restarts = 0;
        const state = () => ({ time: a.currentTime, paused: a.paused, ended: a.ended, seeking: a.seeking,
          ready: a.readyState, rate: a.playbackRate, error: a.error?.message || null });
        window.state = state;
        for (const type of ['loadedmetadata', 'play', 'playing', 'pause', 'seeking', 'seeked', 'ended', 'error'])
          a.addEventListener(type, () => { events.push({ type, ...state() }); if (events.length > 400) events.shift(); });
        const ctx = new AudioContext(); window.ctx = ctx;
        const meter = ctx.createAnalyser(), mute = ctx.createGain(); mute.gain.value = 0;
        ctx.createMediaElementSource(a).connect(meter); meter.connect(mute); mute.connect(ctx.destination);
        window.peak = () => { const values = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(values); return Math.max(...values.map(Math.abs)); };
        if (source === 'http') a.src = '/tone.wav';
        else {
          const bytes = source === 'input' ? null : await (await fetch('/tone.wav')).arrayBuffer();
          const file = source === 'blob' ? new Blob([bytes], { type: 'audio/wav' }) : source === 'file' ?
            new File([bytes], 'tone.wav', { type: 'audio/wav' }) : document.getElementById('file').files[0];
          a.src = URL.createObjectURL(file);
        }
        a.onended = () => { restarts++; a.pause(); a.currentTime = 0; a.play().catch(e => { window.playError = e.message; }); };
        document.getElementById('play').onclick = async () => {
          try { await ctx.resume(); await a.play(); } catch (e) { window.playError = e.message; }
        };
      }, source);
      await page.locator('#play').click();
      await page.waitForFunction(() => a.currentTime > .05 && peak() > .01, null, { timeout: 5000 });
      await page.evaluate(() => a.pause());
      for (let i = 0; i < 15; i++) {
        await page.evaluate(() => {
          for (const time of [8, 15, 8, 20, 8, 9.45]) a.currentTime = time;
          for (const rate of [1.1, 1, 1.1]) a.playbackRate = rate;
          a.preservesPitch = false; a.preservesPitch = true;
          a.currentTime = 59.9;
        });
        await page.waitForFunction(() => a.currentTime > 59 && !a.seeking, null, { timeout: 5000 });
        await page.locator('#play').click();
        await page.waitForFunction(i => restarts > i && a.currentTime > .05 && a.currentTime < 2 && !a.paused && !a.seeking && peak() > .01, i, { timeout: 5000 });
        assert.equal(await page.evaluate(() => a.playbackRate), 1.1);
        await page.evaluate(() => a.pause()); row.iterations++;
      }
      assert.deepEqual(row.errors, []); assert.deepEqual(row.external, []); row.status = 'PASS';
    } catch (e) { row.status = 'FAIL'; row.failure = e.message; }
    row.final = await page.evaluate(() => ({ state: window.state?.(), events: window.events,
      restarts: window.restarts, playError: window.playError, peak: window.peak?.(), context: window.ctx?.state }));
    await context.close(); console.log(source, row.status, row.iterations);
  }
  report.status = report.cases.every(row => row.status === 'PASS') ? 'PASS' : 'FAIL';
} finally {
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
if (report.status !== 'PASS') process.exitCode = 1;
