import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4235';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=await mkdtemp(join(tmpdir(),'jamloom-studio-access-')),checks=[];
console.log('Evidence:',output);
const ownFile=new URL('../../web/practice-audio/funked-up.mp3',import.meta.url).pathname;
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const mode=state=>page.locator('html[data-studio-mode='+state+']').waitFor({state:'attached'});
  const ready=id=>page.waitForFunction(id=>document.getElementById('state-'+id).textContent==='Ready',id);
  await page.goto(base+'/dj-studio');await page.getByRole('link',{name:'Open Studio',exact:true}).click();await mode('demo');
  assert.match(await page.title(),/Performance Studio/);assert.equal(new URL(page.url()).pathname,'/studio/dj.html');
  assert.ok(await page.getByRole('heading',{name:'Performance studio',exact:true}).isVisible());
  await page.locator('#music-rights').check();await page.locator('.studio-nav a[href="#saved-mixes"]').click();
  await page.locator('#practice-track option[value="funked-up"]').waitFor({state:'attached'});assert.equal(await page.locator('#file-a').isDisabled(),true);
  for(const [id,track] of [['a','funked-up'],['b','rhythm-garden']]){await page.locator('#practice-track').selectOption(track);await page.locator('#practice-load-'+id).click();await ready(id);}
  await page.locator('#file-a').setInputFiles(ownFile);assert.match(await page.locator('#name-a').innerText(),/Funked Up/);
  await page.locator('#play-a').click();await page.waitForFunction(()=>document.getElementById('audio-a').currentTime>.1);await page.locator('#play-a').click();
  await page.locator('.deck-a .deck-tools > summary').click();await page.locator('#prepare-frames-a').click();await page.getByText('Beat controls and scratch ready.',{exact:false}).waitFor();
  await page.locator('#bpm-a').fill('120');await page.locator('#bpm-a').dispatchEvent('change');await page.locator('#beat-loop-a').click();
  await page.locator('.studio-nav a[href="#sampler"]').click();await page.locator('#sample-consent').check();await page.locator('#sample-demo').click();await page.getByText('Loaded pad 1.',{exact:false}).waitFor();
  await page.locator('#sample-pad-0').click();await page.locator('#sample-pad-0[data-playing=true]').waitFor({state:'attached'});await page.locator('#sample-stop').click();
  await page.locator('.studio-nav a[href="#performance"]').click();await page.locator('#phrase-consent').check();await page.locator('#phrase-demo').click();await page.getByText('4.00 s phrase ready',{exact:false}).waitFor();
  assert.equal(await page.locator('#phrase-file').isDisabled(),true);
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(node=>node.open=false));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,name+'-demo.png')});
  page.once('dialog',d=>d.accept());await page.locator('#studio-basic').click();await mode('basic');
  await page.locator('#music-rights').check();await page.locator('#file-a').setInputFiles(ownFile);await ready('a');
  for(const id of ['prepare-frames-a','load-instruments','reverb-a'])assert.equal(await page.locator('#'+id).isDisabled(),true,id);
  for(const id of ['tone-a','eq-a-0'])assert.equal(await page.locator('#'+id).isDisabled(),false,id);
  await page.locator('#play-a').click();await page.waitForFunction(()=>document.getElementById('audio-a').currentTime>.1);
  await page.locator('#crossfade').fill('0.5');assert.match(await page.locator('#blend-value').innerText(),/50%/);await page.locator('#pause-all').click();
  await page.evaluate(()=>document.getElementById('prepare-frames-a').dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await page.locator('#prepare-frames-a').isDisabled(),true);
  await page.screenshot({path:join(output,name+'-basic.png')});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,name+'-mobile.png')});
  await page.evaluate(()=>{location.hash='sampler';});await page.reload();await mode('basic');
  assert.equal(await page.locator('#sample-delete-bank').isDisabled(),false);
  // Paid UI fixture only: the real entitlement/payment database is not modified.
  await page.route('**/api/pro/access',r=>r.fulfill({json:{active:true}}));await page.route('**/api/aurowall',r=>r.fulfill({json:{tracks:[]}}));
  await page.goto(base+'/studio/dj.html#pro');await page.reload();await mode('pro');await page.locator('#music-rights').check();await page.locator('#file-a').setInputFiles(ownFile);await ready('a');
  assert.equal(await page.locator('#prepare-frames-a').isDisabled(),false);assert.equal(await page.locator('#reverb-a').isDisabled(),false);
  await page.unroute('**/api/pro/access');await page.reload();await mode('demo');assert.equal(await page.locator('#file-a').isDisabled(),true);assert.deepEqual(errors,[]);
  if(name==='chromium'){
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/studio/service-worker.js');await navigator.serviceWorker.ready;});
   await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await context.setOffline(true);await page.reload();await mode('demo');
   await page.locator('#studio-basic').click();await mode('basic');await page.locator('#music-rights').check();
   await page.locator('#file-a').setInputFiles(ownFile);await ready('a');await context.setOffline(false);
  }
  checks.push({browser:name,anonymousDemo:'PASS',twoSampleDecks:'PASS',samplePlayback:'PASS',beatControls:'PASS',sampler:'PASS',samplePhrase:'PASS',basicPersonalTrack:'PASS',basicProRestrictions:'PASS',paidFixture:'PASS',revokedFixture:'PASS',accessibility:'PASS',mobileOverflow:'PASS',offlineDemoAndBasic:name==='chromium'?'PASS':'NOT RUN',errors});await context.close();
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify({checks,paidFixture:'Simulated access response; no purchase or entitlement writes',hardwareListening:'NOT RUN'},null,2));console.log('PASS',output);
