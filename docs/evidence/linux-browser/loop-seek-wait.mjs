import { webkit } from '/work/apps/web/node_modules/playwright/index.mjs';
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
const set = async (id, value) => { await page.locator(id).fill(String(value)); await page.locator(id).dispatchEvent('input'); };
const report = { browser: browser.version(), iterations: [], errors: [] };
page.on('pageerror', e => report.errors.push(e.message));
try {
  await page.route('**/dj.js', async route => { const response = await route.fetch(); const source = await response.text(); await route.fulfill({ response, body: source.replace('if (audio.ended) audio.currentTime = 0;', "if (audio.ended) {\n        audio.currentTime = 0;\n        if (audio.seeking) await new Promise((resolve, reject) => {\n          const done = () => { clearTimeout(timer); audio.removeEventListener('seeked', done); resolve(); };\n          const timer = setTimeout(() => { audio.removeEventListener('seeked', done); reject(new Error('Track seek timed out.')); }, 5000);\n          audio.addEventListener('seeked', done, { once: true });\n        });\n        if (revision !== deck.revision || !rights.checked || !deck.playRequested) return;\n      }") }); });
  await page.goto('http://127.0.0.1:3000/dj.html');
  const rate = 48000, frames = rate * 60, data = Buffer.alloc(44 + frames * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) data.writeInt16LE(Math.round(8192 * Math.sin(2 * Math.PI * 220 * i / rate)), 44 + i * 2);
  await page.locator('#music-rights').check(); await page.locator('#file-a').setInputFiles({ name: 'probe.wav', mimeType: 'audio/wav', buffer: data });
  await page.waitForFunction(() => !document.getElementById('play-a').disabled); await page.locator('#play-a').click(); await page.waitForTimeout(200); await page.locator('#play-a').click();
  await page.evaluate(() => {
    window.events = [];
    const a = document.getElementById('audio-a');
    for (const type of ['play','playing','pause','seeking','seeked','ended','error']) a.addEventListener(type, () => events.push({ type, time:a.currentTime, paused:a.paused, ended:a.ended }));
  });
  for (let i = 0; i < 15; i++) {
    await set('#seek-a', 8); await page.locator('#set-cue-a').click();
    await set('#seek-a', 15); await page.locator('#cue-a').click();
    await page.locator('#hot-a-0').click(); await set('#seek-a', 20); await page.locator('#hot-a-0').click();
    await page.locator('#hot-a-0').click({ modifiers: ['Shift'] });
    await page.locator('#jog-a').focus(); await page.keyboard.press('Shift+ArrowRight');
    const box = await page.locator('#jog-a').boundingBox();
    await page.mouse.move(box.x + box.width/2,box.y+10); await page.mouse.down();
    await page.mouse.move(box.x+box.width-10,box.y+box.height/2,{steps:8});await page.mouse.up();
    for (const value of ['1.1','1','1.1']) await set('#rate-a',value);
    await page.locator('#keylock-a').uncheck();await page.locator('#keylock-a').check();
    await page.locator('#loop-a').click();
    const beforeSeek = await page.locator('#audio-a').evaluate(a=>({time:a.currentTime,paused:a.paused}));
    await set('#seek-a',59.9);
    await page.waitForFunction(() => document.getElementById('audio-a').currentTime > 59 && !document.getElementById('audio-a').seeking);
    const beforeClick = await page.locator('#audio-a').evaluate(a=>({time:a.currentTime,paused:a.paused}));
    report.iterations.push({iteration:i+1,beforeSeek,beforeClick});
    await page.locator('#play-a').click();
    await page.waitForFunction(()=>{const a=document.getElementById('audio-a');return a.currentTime<2&&!a.paused&&!a.seeking;},null,{timeout:10000});
    await page.locator('#play-a').click();await page.locator('#loop-a').click();
    report.iterations.at(-1).status='PASS';
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = error.message; report.events = await page.evaluate(()=>window.events); report.deckError=await page.locator('#error-a').textContent(); }
finally { await fs.writeFile('/work/renders/loop-seek-wait.json', JSON.stringify(report, null, 2)); await browser.close(); }
console.log(report.status, report.iterations.length);

if (report.status !== 'PASS') process.exitCode = 1;
