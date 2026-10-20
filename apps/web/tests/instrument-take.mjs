import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { fakeMidi } from './midi-browser.mjs';
import { replayTake } from '../live-take.js';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.JAMLOOM_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/instrument-take-${kind}-`));
const publicRoot = path.join(root, 'dist/web'), errors = [], external = [], checks = [], warnings = [];
let takingScreenshot = false;
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://local').pathname.slice(1);
  if (req.method !== 'GET' || !/^[\w./-]+$/.test(name) || name.split('/').includes('..')) { res.writeHead(404); res.end(); return; }
  try {
    const bytes = await fs.readFile(path.join(publicRoot, name));
    res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml'})[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/dj.html`;
let browser;
try {
  browser = await {chromium,webkit}[kind].launch();
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(fakeMidi);
  await context.addInitScript(() => {
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.testContext = this; }
    };
    const Rack = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends Rack { constructor(...args) { super(...args); window.testRack=this; } };
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Same narrowly scoped Playwright/WebKit screenshot warning as the existing DJ suite.
    if (takingScreenshot && kind === 'webkit' && m.text().startsWith('Refused to apply a stylesheet')) warnings.push(m.text());
    else errors.push(m.text());
  });
  const screenshot = async name => {
    takingScreenshot = true;
    try { await page.screenshot({path:path.join(output,name)}); }
    finally { takingScreenshot = false; }
  };
  page.on('request', r => { if (!r.url().startsWith(url.replace('/dj.html','/')) && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.goto(url);
  assert.equal(await page.title(), 'Jamloom — DJ workspace');
  assert.equal(await page.locator('h1').textContent(), 'Performance studio');
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => document.getElementById('load-instruments').textContent === 'Instruments ready');
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  await page.locator('#take-consent').check();
  await page.locator('#take-start').click();
  await page.waitForFunction(() => !document.getElementById('take-stop').disabled);
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(150); await page.keyboard.up('a');
  await page.locator('#patch').selectOption('11');
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(150);
  await page.locator('#mouth').fill('0.7'); await page.locator('#mouth').dispatchEvent('input');
  await page.waitForTimeout(150); await page.keyboard.up('a');
  await page.locator('#midi-enable').click(); await page.locator('#midi-input').selectOption('one');
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
  await page.evaluate(() => midiPorts[0].emit([0x99,39,110])); await page.waitForTimeout(180);
  await page.evaluate(() => midiPorts[0].emit([0x89,39,0]));
  await page.waitForTimeout(300); await page.locator('#take-stop').click();
  await page.locator('#take-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  const downloads = {};
  for (const [id, name] of [['take-wav','take.wav'], ['take-trace','take.json']]) {
    const promise = page.waitForEvent('download'); await page.locator(`#${id}`).click();
    const download = await promise; await download.saveAs(path.join(output,name)); downloads[id]=name;
  }
  const take = JSON.parse(await fs.readFile(path.join(output,'take.json'),'utf8'));
  assert.equal(take.training_authorized,false);
  for (const patch of [0,11,12]) assert.ok(take.events.some(e=>e.command.type==='note' && e.command.patch===patch));
  assert.ok(take.events.some(e=>e.command.type==='mouth' && e.command.position===.7));
  const wav = await fs.readFile(path.join(output,'take.wav'));
  const replay = await replayTake(take,await fs.readFile(path.join(publicRoot,'engine/jamloom_live.wasm')));
  assert.deepEqual(Buffer.from(replay),wav);
  let peak=0; for(let i=44;i<wav.length;i+=2) peak=Math.max(peak,Math.abs(wav.readInt16LE(i))/32768);
  assert.ok(peak>.001 && peak<1);
  await page.locator('#take-player').evaluate(audio=>audio.play());
  await page.waitForFunction(()=>document.getElementById('take-player').currentTime>0);
  await page.locator('#take-player').evaluate(audio=>audio.pause());
  checks.push('consent-gated keyboard, mouth and simulated MIDI recording; playable WAV and exact replay');
  await page.locator('.instrument-take').scrollIntoViewIfNeeded();
  await screenshot('desktop.png');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.instrument-take').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await screenshot('mobile.png');
  checks.push('desktop/mobile capture controls render without horizontal overflow');
  await page.locator('#take-delete').click();
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  assert.equal(await page.locator('#take-player').getAttribute('src'),null);
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.locator('#take-consent').uncheck();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  checks.push('delete and permission withdrawal discard local take without restoring stale export');
  await page.locator('#take-consent').check(); await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.match(await page.locator('#take-status').textContent(),/interrupted/);
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.evaluate(()=>testContext.suspend());
  await page.waitForFunction(()=>document.getElementById('take-status').textContent.includes('interrupted'));
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.evaluate(()=>testRack.dispatchEvent(new Event('processorerror')));
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  checks.push('focus loss, audio suspension and worklet failure discard incomplete capture');
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',browser:kind,version:browser.version(),
    url,viewports:[[1440,1000],[390,844]],checks,errors,external,warnings,
    frames:take.frames,rate:take.sample_rate,acceptedCommands:take.events.length,peak,
    replay:'byte-identical WAV; max and RMS PCM difference 0',physicalMidi:'NOT RUN',humanQuality:'NOT RUN',
    training:'NOT RUN',scope:'private dry instrument capture; simulated input, actual browser/worklet audio'},null,2));
  console.log(JSON.stringify({status:'PASS',output,checks}));
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
