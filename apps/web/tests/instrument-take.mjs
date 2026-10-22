import {revealStudioTools} from './studio-tools.mjs';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { silenceSpeakers } from '../../site/tests/silent-audio.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { fakeMidi } from './midi-browser.mjs';
import { replayTake } from '../live-take.js';
import { verifyPhrasePair } from '../phrase-pair.js';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.JAMLOOM_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/instrument-take-${kind}-`));
const publicRoot = path.join(root, 'dist/web'), errors = [], external = [], checks = [], warnings = [];
let takingScreenshot = false;
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://local').pathname.slice(1);
  if (name === 'api/aurowall' || name === 'api/site-status') { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(name === 'api/aurowall' ? {tracks:[]} : {banner:null})); return; }
  if (req.method !== 'GET' || !/^[\w./-]+$/.test(name) || name.split('/').includes('..')) { res.writeHead(404); res.end(); return; }
  try {
    const bytes = await fs.readFile(path.join(publicRoot, name));
    res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml'})[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/dj.html`;
let browser;
try {
  browser = await {chromium,webkit}[kind].launch();
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(silenceSpeakers);
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
  await page.goto(url);await revealStudioTools(page);
  assert.equal(await page.title(), 'Jamloom Pro — Performance Studio');
  assert.equal(await page.locator('h1').textContent(), 'Performance studio');
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  assert.equal(await page.locator('#take-include-phrase').isDisabled(),true);
  await page.locator('#load-instruments').click();
  await page.waitForFunction(() => document.getElementById('load-instruments').textContent === 'Instruments ready');
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  await page.locator('#take-consent').check();
  await page.locator('#take-start').click();
  await page.waitForFunction(() => !document.getElementById('take-stop').disabled);
  await page.locator('#mix-record-consent').check(); await page.locator('#mix-record-start').click();
  await page.waitForFunction(() => !document.getElementById('mix-record-stop').disabled);
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
  await page.locator('#sequence-step-0').selectOption('60');
  await page.locator('#sequence-step-2').selectOption('64');
  await page.locator('#sequence-start').click();
  await page.waitForFunction(() => !document.getElementById('sequence-stop').disabled);
  await page.waitForTimeout(500); await page.locator('#sequence-stop').click();
  await page.waitForTimeout(300); await page.locator('#mix-record-stop').click();
  await page.locator('#mix-record-sources').waitFor({state:'visible'});
  await page.locator('#take-stop').click();
  await page.locator('#take-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#take-start').isDisabled(),true);
  const downloads = {};
  for (const [id, name] of [['take-wav','take.wav'], ['take-trace','take.json']]) {
    const promise = page.waitForEvent('download'); await page.locator(`#${id}`).click();
    const download = await promise; await download.saveAs(path.join(output,name)); downloads[id]=name;
  }
  const take = JSON.parse(await fs.readFile(path.join(output,'take.json'),'utf8'));
  assert.equal(take.training_authorized,false);
  assert.ok(take.events.some(e => e.command.type === 'note' && e.command.id >= 0xffffff00));
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
  assert.equal(take.schema_version, '1.1-live-instrument-take');
  assert.ok(Number.isSafeInteger(take.observed_context_start_frame));
  for (const [id,name] of [['mix-record-json','mix.json'],['mix-record-automation','controls.json'],['mix-record-sources','sources.json'],['mix-record-transport','transport.json']]) {
    const pending=page.waitForEvent('download'); await page.locator('#'+id).click(); await (await pending).saveAs(path.join(output,name));
  }
  const mix=JSON.parse(await fs.readFile(path.join(output,'mix.json'),'utf8'));
  assert.ok(take.observed_context_start_frame <= mix.observed_context_start_frame);
  assert.ok(take.observed_context_start_frame+take.frames >= mix.observed_context_start_frame+mix.frames);
  const run=promisify(execFile), packageFile=path.join(output,'replay.json');
  await run(process.execPath,['scripts/prepare_mix_replay.mjs',...['mix.json','controls.json','sources.json','transport.json'].map(n=>path.join(output,n)),packageFile,path.join(output,'take.json')],{cwd:root});
  const bindings=path.join(output,'assets.json'); await fs.writeFile(bindings,JSON.stringify({[take.engine_sha256]:path.join(publicRoot,'engine/jamloom_live.wasm')}));
  await run(process.execPath,['scripts/replay_mix.mjs',packageFile,bindings,path.join(output,'replay')],{cwd:root,env:{...process.env,JAMLOOM_BROWSER:kind},timeout:130000});
  const reconstructed=await fs.readFile(path.join(output,'replay/replay.wav'));assert.equal(reconstructed.length,44+mix.frames*4);
  let reconstructedPeak=0;for(let i=44;i<reconstructed.length;i+=2)reconstructedPeak=Math.max(reconstructedPeak,Math.abs(reconstructed.readInt16LE(i)));
  assert.ok(reconstructedPeak>30);checks.push('actual concurrent take/mix clocks assemble and render a private action-only reconstruction');
  await page.locator('#mix-record-delete').click();
  assert.equal(await page.locator('#take-source').isVisible(),false);
  await page.locator('#take-delete').click();
  await page.locator('#phrase-consent').check();
  const fixture = path.join(root,'renders/fixtures/synthetic-speech.wav');
  await page.locator('#phrase-file').setInputFiles(fixture);
  await page.waitForFunction(()=>document.getElementById('phrase-status').textContent.includes('phrase ready'));
  assert.equal(await page.locator('#take-include-phrase').isChecked(),false);
  await page.locator('#take-include-phrase').check();
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.waitForTimeout(200); await page.keyboard.up('a'); await page.waitForTimeout(200);
  await page.locator('#take-stop').click();
  await page.locator('#take-pair').waitFor({state:'visible'});
  for (const [id,name] of [['take-wav','paired-response.wav'],['take-trace','paired-response.json'],['take-source','source.wav'],['take-pair','pair.json']]) {
    const promise = page.waitForEvent('download'); await page.locator(`#${id}`).click();
    await (await promise).saveAs(path.join(output,name));
  }
  const pair = JSON.parse(await fs.readFile(path.join(output,'pair.json'),'utf8'));
  const pairedTrace = await verifyPhrasePair(pair, await fs.readFile(path.join(output,'source.wav')),
    await fs.readFile(path.join(output,'paired-response.json')));
  assert.equal(pair.context_at_start,null); assert.equal(pair.source.origin,'imported_file');
  assert.deepEqual(Buffer.from(await replayTake(pairedTrace,await fs.readFile(path.join(publicRoot,'engine/jamloom_live.wasm')))),
    await fs.readFile(path.join(output,'paired-response.wav')));
  checks.push('explicit source pairing exports four hash-linked files; response WAV replays exactly; no inferred context or training rights');
  await page.locator('.instrument-take').scrollIntoViewIfNeeded();
  await screenshot('desktop.png');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.instrument-take').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await screenshot('mobile.png');
  checks.push('desktop/mobile capture controls render without horizontal overflow');
  await page.locator('#phrase-consent').uncheck();
  assert.match(await page.locator('#take-status').textContent(),/Source changed or permission removed/);
  assert.equal(await page.locator('#take-pair').isVisible(),false);
  assert.equal(await page.locator('#take-include-phrase').isChecked(),false);
  await page.locator('#phrase-consent').check();
  await page.locator('#phrase-file').setInputFiles(fixture);
  await page.waitForFunction(()=>!document.getElementById('take-include-phrase').disabled);
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles(fixture);
  await page.waitForFunction(()=>!document.getElementById('prepare-a').disabled);
  await page.locator('#prepare-a').click();
  await page.waitForFunction(()=>!document.getElementById('context-confirmed').disabled);
  await page.locator('#session-bpm').fill('120'); await page.locator('#session-bpm').dispatchEvent('change');
  await page.locator('#session-key').selectOption('60'); await page.locator('#session-mode').selectOption('major');
  await page.locator('#session-downbeat').fill('0.5'); await page.locator('#session-downbeat').dispatchEvent('change');
  await page.locator('#context-confirmed').check();
  await page.locator('#take-include-phrase').check(); await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.locator('#session-bpm').fill('140'); await page.locator('#session-bpm').dispatchEvent('change');
  await page.locator('#take-stop').click(); await page.locator('#take-pair').waitFor({state:'visible'});
  for (const [id,name] of [['take-pair','context-pair.json'],['take-trace','context-response.json']]) {
    const promise=page.waitForEvent('download'); await page.locator(`#${id}`).click();
    await (await promise).saveAs(path.join(output,name));
  }
  const frozen = JSON.parse(await fs.readFile(path.join(output,'context-pair.json'),'utf8'));
  assert.deepEqual(frozen.context_at_start, {tempo_milli_bpm:120000,tonic_midi:60,mode:'major',beats_per_bar:4,downbeat_seconds:.5,status:'user_confirmed'});
  await verifyPhrasePair(frozen,await fs.readFile(path.join(output,'source.wav')),await fs.readFile(path.join(output,'context-response.json')));
  await page.locator('#take-delete').click(); await page.locator('#take-include-phrase').uncheck();
  await page.locator('#release-a').click();
  checks.push('confirmed tempo/key/downbeat frozen at start; later context edits do not relabel the response');
  // Merely loading a phrase must not include it in a plain instrument take.
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.waitForTimeout(150); await page.locator('#take-stop').click();
  await page.locator('#take-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#take-source').isVisible(),false);
  assert.equal(await page.locator('#take-pair').isVisible(),false);
  await page.locator('#take-delete').click();
  await page.locator('#take-include-phrase').check();
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.locator('#phrase-file').setInputFiles(fixture);
  await page.waitForFunction(()=>document.getElementById('take-status').textContent.includes('Source changed'));
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  assert.equal(await page.locator('#take-include-phrase').isChecked(),false);
  // Hold async hashing, withdraw the pairing permission, then release the stale completion.
  await page.locator('#take-include-phrase').check();
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.waitForTimeout(150);
  await page.evaluate(()=>{
    const digest=crypto.subtle.digest.bind(crypto.subtle); window.pendingDigests=[]; let calls=0;
    crypto.subtle.digest=async (...args)=>{if (++calls===2) await new Promise(resolve=>pendingDigests.push(resolve)); return digest(...args);};
    window.releaseDigests=()=>{crypto.subtle.digest=digest; pendingDigests.forEach(resolve=>resolve());};
  });
  await page.locator('#take-stop').click();
  await page.waitForFunction(()=>pendingDigests.length>0);
  await page.locator('#take-include-phrase').uncheck();
  await page.evaluate(()=>releaseDigests());
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#take-wav').isVisible(),false);
  assert.equal(await page.locator('#take-pair').isVisible(),false);
  checks.push('loaded source excluded by default; replacement and consent withdrawal discard paired takes, including stale async completion');
  await page.locator('#take-start').click();
  await page.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await page.waitForTimeout(150); await page.locator('#take-stop').click();
  await page.locator('#take-wav').waitFor({state:'visible'});
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
  await page.evaluate(()=>testRack.context.suspend());
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
