import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4224';
assert.equal(new URL(base).hostname,'127.0.0.1');
const evidence=new URL(process.env.JAMLOOM_TEST_EVIDENCE??'../../../docs/evidence/deck-presentation/',import.meta.url),results=[];
await mkdir(evidence,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/academy/lessons/first-crossfade');await page.waitForLoadState('networkidle');
  await page.locator('#music-rights').check();await page.locator('#academy-load').click();
  await page.locator('#academy-check').waitFor({state:'visible'});
  for(const id of ['level-a','level-b','eq-a-0','eq-b-2','crossfade','master'])assert.equal(await page.locator('.mix-bus #'+id).count(),1);
  const unique=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;});assert.ok(unique);
  for(const width of [1440,1024,820,768,560,390,320]){
   await page.setViewportSize({width,height:1100});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+width);
   assert.ok(await page.locator('.console').evaluate(e=>e.scrollWidth<=e.clientWidth),'console overflow '+width);
   if([1440,390,320].includes(width))await page.locator('.console').screenshot({path:new URL(name+'-'+width+'.png',evidence).pathname});
  }
  await page.setViewportSize({width:1440,height:1100});
  await page.locator('#play-a').click();await page.waitForFunction(()=>Number(document.querySelector('#seek-a').value)>.3);
  await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
  const spin=await page.locator('#vinyl-a').getAttribute('style');await page.waitForTimeout(250);assert.notEqual(await page.locator('#vinyl-a').getAttribute('style'),spin);
  assert.equal(await page.locator('.deck-a').getAttribute('data-playing'),'true');
  // Real channel fader still silences this deck, then restores its signal.
  await page.locator('#level-a').focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>document.querySelector('#output-meter').value<.00001);assert.equal(await page.locator('#level-value-a').innerText(),'0%');
  await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
  await page.locator('#eq-a-0').focus();await page.keyboard.press('End');assert.equal(await page.locator('#eq-a-0-value').innerText(),'12 dB');await page.keyboard.press('Home');assert.equal(await page.locator('#eq-a-0-value').innerText(),'-12 dB');
  await page.locator('.deck-a .deck-fx-panel summary').click();await page.locator('#echo-a').focus();await page.keyboard.press('End');assert.equal(await page.locator('#echo-a-value').innerText(),'50%');await page.locator('#fx-reset-a').click();assert.equal(await page.locator('#echo-a-value').innerText(),'Off');
  await page.locator('#play-a').click();await page.waitForFunction(()=>document.querySelector('.deck-a').dataset.playing==='false');assert.equal(await page.locator('.deck-a').getAttribute('data-playing'),'false');
  await page.locator('#jog-a').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>Number(document.querySelector('#seek-a').value)>=.09);
  const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#vinyl-a').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.goto(base+'/academy/lessons/first-crossfade');await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});
  for(const deck of ['a','b']){
   await page.locator('#play-'+deck).click();await page.waitForTimeout(2400);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});
   assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/);await page.locator('#academy-next').click();
  }
  await page.locator('#crossfade').focus();await page.keyboard.press('Home');
  for(let i=0;i<100;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(35);}
  await page.waitForTimeout(250);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.console').screenshot({path:new URL(name+'-playing.png',evidence).pathname});
  await page.goto(base+'/studio/dj.html');await page.waitForLoadState('networkidle');assert.equal(await page.locator('.mixer-channels input').count(),8);assert.equal(await page.locator('.jog').count(),2);
  assert.deepEqual(errors,[]);
  results.push({browser:name,version:browser.version(),gate:'PASS',viewports:[1440,1024,820,768,560,390,320],realPlayback:true,platterFollowsPlayback:true,channelFaderSilencesAudio:true,eqAndEchoControls:true,keyboardJog:true,reducedMotion:true,axeViolations:0,standaloneStudio:true,academyThreeChecks:true});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
