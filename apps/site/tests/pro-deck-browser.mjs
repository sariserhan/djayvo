import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4235';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=await mkdtemp(join(tmpdir(),'jamloom-pro-deck-')),checks=[];console.log('Evidence:',output);
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=id=>page.waitForFunction(id=>document.getElementById('state-'+id).textContent==='Ready',id);
  const seek=async value=>{await page.locator('#seek-a').fill(String(value));await page.waitForFunction(value=>Math.abs(Number(document.getElementById('seek-a').value)-value)<.05,value);};
  const position=()=>page.locator('#seek-a').inputValue().then(Number);
  const mode=async value=>page.locator('.deck-a .pro-pad-modes button[data-pad-mode='+value+']').click();
  await page.goto(base+'/studio/dj.html#pro-demo');await page.locator('html.studio-pro').waitFor({state:'attached'});assert.equal(await page.locator('#music-rights').count(),0);assert.equal(await page.getByText('I have permission to play and mix the tracks I load.',{exact:true}).count(),0);
  await page.locator('.studio-nav a[href="#saved-mixes"]').click();
  for(const [id,track] of [['a','funked-up'],['b','rhythm-garden']]){await page.locator('#practice-track').selectOption(track);await page.locator('#practice-load-'+id).click();await ready(id);await page.locator('#pro-prepare-'+id).click();await page.waitForFunction(id=>document.getElementById('pro-prepare-'+id).textContent==='Waveform ready',id);await page.locator('#bpm-'+id).fill('120');}
  assert.equal(await page.locator('.deck-a .hotcue').count(),8);
  await page.locator('#pro-quantize-a').click();await seek(10.2);await page.locator('#hot-a-7').click();assert.match(await page.locator('#hot-a-7').innerText(),/10.0 s/);
  await seek(2);await page.locator('#hot-a-7').click();await page.waitForFunction(()=>Number(document.getElementById('seek-a').value)===10);
  await page.locator('#hot-a-7').click({modifiers:['Shift']});assert.match(await page.locator('#hot-a-7').innerText(),/EMPTY/);
  await page.locator('.deck-a .pro-grid-editor > summary').click();await seek(.1);await page.locator('#pro-grid-set-a').click();await page.locator('#pro-grid-right-a').click();await page.waitForFunction(()=>document.getElementById('pro-grid-value-a').textContent.includes('0.110'));
  await page.locator('#pro-wave-a').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>Math.abs(Number(document.getElementById('seek-a').value)-1.1)<.01);
  await seek(10);await page.locator('#loop-a').click();assert.equal(await page.locator('#loop-a').getAttribute('aria-pressed'),'true');await mode('loop');await page.locator('#hot-a-6').click();await page.waitForFunction(()=>document.getElementById('pro-loop-value-a').textContent==='Loop 4.000 s');assert.equal(await page.locator('#loop-a').getAttribute('aria-pressed'),'false');await page.locator('#pro-loop-half-a').click();await page.waitForFunction(()=>document.getElementById('pro-loop-value-a').textContent==='Loop 2.000 s');await page.locator('#pro-loop-double-a').click();
  await page.locator('.deck-a .deck-tools > summary').click();await page.locator('#loop-exit-a').click();await mode('jump');await page.locator('#hot-a-5').click();await page.waitForFunction(()=>Number(document.getElementById('seek-a').value)===12);await page.locator('#pro-jump-direction-a').click();await page.locator('#hot-a-5').click();await page.waitForFunction(()=>Number(document.getElementById('seek-a').value)===10);
  await page.locator('#play-a').click();await page.waitForFunction(()=>Number(document.getElementById('output-meter').value)>0);
  await mode('roll');const before=await position();await page.locator('#hot-a-1').click();await page.waitForFunction(()=>document.getElementById('pro-loop-value-a').textContent==='Roll 0.125 s');await page.locator('#hot-a-2').click();await page.waitForFunction(()=>document.getElementById('pro-loop-value-a').textContent==='Roll 0.250 s');await page.locator('#hot-a-2').click();assert.ok(await position()>=before);
  await page.locator('#play-a').click();await seek(20);await page.locator('#play-a').click();
  const reverse=page.locator('#pro-reverse-a');await page.waitForFunction(()=>!document.getElementById('pro-reverse-a').disabled);await reverse.focus();const start=await position();await page.keyboard.down('Space');assert.equal(await reverse.getAttribute('aria-pressed'),'true');await page.waitForFunction(start=>Number(document.getElementById('seek-a').value)<start-.4,start,{timeout:5000});await page.keyboard.up('Space');await page.waitForFunction(start=>Number(document.getElementById('seek-a').value)>start,start);assert.equal(await reverse.getAttribute('aria-pressed'),'false');
  await page.locator('#pro-slip-a').click();await reverse.focus();const backwardStart=await position();await page.keyboard.down('Space');await page.waitForFunction(start=>Number(document.getElementById('seek-a').value)<start-.4,backwardStart);await page.keyboard.up('Space');assert.ok(await position()<backwardStart);await page.locator('#pause-all').click();
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await page.locator('#pro-echo-sync-a').selectOption('0.5');await page.waitForFunction(()=>document.getElementById('delay-a').value==='250');await page.locator('#bpm-a').fill('100');await page.waitForFunction(()=>document.getElementById('delay-a').value==='300');
  assert.equal(await page.locator('#delay-a').isDisabled(),true);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));await page.locator('.console').screenshot({path:join(output,name+'-console.png')});await page.locator('.pro-overviews').screenshot({path:join(output,name+'-waveforms.png')});
  for(const width of [390,900,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);}
  await page.locator('#studio-fullscreen').click();assert.equal(await page.evaluate(()=>document.getElementById('dj').scrollWidth>document.getElementById('dj').clientWidth),false);await page.locator('#studio-fullscreen').click();
  await page.setViewportSize({width:390,height:844});await page.locator('.deck-a').screenshot({path:join(output,name+'-mobile-deck.png')});
  // Active access fixture tests local saved sets, without a purchase or account mutation.
  await page.route('**/api/pro/access',r=>r.fulfill({json:{active:true}}));await page.route('**/api/aurowall',r=>r.fulfill({json:{tracks:[]}}));await page.goto(base+'/studio/dj.html#pro');await page.reload();await page.locator('html[data-studio-mode=pro]').waitFor({state:'attached'});
  await page.locator('#file-a').setInputFiles(new URL('../../web/practice-audio/funked-up.mp3',import.meta.url).pathname);await ready('a');await page.locator('#bpm-a').fill('120');await seek(3.2);await page.locator('#hot-a-7').click();
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await page.locator('#pro-grid-set-a').click();await page.locator('#pro-quantize-a').click();await page.locator('#pro-echo-sync-a').selectOption('0.5');await page.locator('#remember-set').check();await page.getByText('Set recovery saved on this device. Playback will restore paused.',{exact:true}).waitFor();
  await page.locator('#remember-set').uncheck();await page.locator('#clear-a').click();await page.locator('#recovery-restore').click();await page.getByText('Set restored, paused.',{exact:false}).waitFor();assert.match(await page.locator('#hot-a-7').innerText(),/3.2 s/);await page.waitForFunction(()=>document.getElementById('pro-quantize-a').getAttribute('aria-pressed')==='true');assert.match(await page.locator('#pro-grid-value-a').innerText(),/3.200/);assert.equal(await page.locator('#pro-echo-sync-a').inputValue(),'0.5');await page.locator('#recovery-delete').click();
  await page.goto(base+'/academy/lessons/first-crossfade');await page.locator('#academy-load').waitFor();assert.equal(await page.locator('html.studio-pro').count(),0);assert.equal(await page.locator('.deck-a .hotcue').count(),4);await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});await page.locator('#play-a').click();await page.waitForFunction(()=>Number(document.getElementById('seek-a').value)>.1);await page.locator('#pause-all').click();
  assert.deepEqual(errors,[]);checks.push({browser:name,playbackWithoutPrompt:'PASS',eightCues:'PASS',quantizedWaveformAndCues:'PASS',gridEditing:'PASS',loopResize:'PASS',fractionalRoll:'PASS',beatJumpBothDirections:'PASS',reverseAndSlipReturn:'PASS',tempoEcho:'PASS',savedEightCueSet:'PASS',accessibility:'PASS',responsiveAndFullscreen:'PASS',academySharedDeckSmoke:'PASS',pageErrors:errors});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify({checks,speakers:'Muted',hardware:'NOT RUN',paidAccess:'Fixture only'},null,2));console.log('PASS',output);
