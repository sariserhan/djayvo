import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4224';
assert.equal(new URL(base).hostname,'127.0.0.1');
const evidence=new URL('../../../docs/evidence/studio-simplicity/',import.meta.url),results=[];
await mkdir(evidence,{recursive:true});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>{
   const url=new URL(r.request().url());
   if(['/api/aurowall','/api/catalogue'].includes(url.pathname))return r.fulfill({json:{tracks:[]}});
   return url.origin===base||url.protocol==='blob:'?r.continue():r.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio/dj.html');await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.studio-panel[open],.studio-options[open],.deck-tools[open]').count(),0);
  assert.ok(await page.locator('#play-a').isDisabled());
  await page.locator('.studio-nav a[href="#saved-mixes"]').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#practice-track').isVisible());assert.equal(await page.evaluate(()=>document.activeElement.id),'saved-mixes');
  await page.locator('#practice-track').selectOption('funked-up');await page.locator('#practice-load-a').click();
  await page.waitForFunction(()=>!document.querySelector('#play-a').disabled);
  assert.match(await page.locator('#play-a').innerText(),/Play/);
  await page.locator('.deck-a .deck-tools > summary').click();await page.locator('#prepare-frames-a').click();
  await page.waitForFunction(()=>!document.querySelector('#beat-loop-a').disabled);
  await page.locator('#play-a').click();await page.waitForFunction(()=>Number(document.querySelector('#seek-a').value)>.3&&document.querySelector('#output-meter').value>.001);
  const time=Number(await page.locator('#seek-a').inputValue());
  await page.locator('.deck-a .deck-tools > summary').click();await page.locator('#saved-mixes > details > summary').click();
  await page.locator('.studio-nav a[href="#performance"]').click();assert.ok(await page.locator('#phrase-record').isVisible());
  assert.equal(await page.locator('#performance .step-title').count(),3);await page.locator('#performance > details > summary').click();
  assert.ok(Number(await page.locator('#seek-a').inputValue())>time,'folding tools preserves playback');
  await page.locator('.studio-nav a[href="#recordings"]').click();
  const recording=page.locator('#recordings > details').filter({has:page.locator('#mix-record-consent')});await recording.locator(':scope > summary').click();
  await page.locator('#mix-record-consent').check();await page.locator('#mix-record-start').click();
  await page.waitForFunction(()=>!document.querySelector('#mix-record-stop').disabled);
  await recording.locator(':scope > summary').click();assert.match(await recording.locator(':scope > summary').evaluate(e=>getComputedStyle(e,'::after').content),/Recording/);
  await recording.locator(':scope > summary').click();await page.waitForTimeout(400);await page.locator('#mix-record-stop').click();await page.locator('#mix-record-wav').waitFor({state:'visible'});
  await page.locator('#pause-all').click();
  await page.locator('.studio-nav a[href="#instruments"]').click();await page.locator('#load-instruments').click();await page.waitForFunction(()=>!document.querySelector('#patch').disabled);
  assert.ok(await page.locator('#keyboard').isVisible());assert.ok(await page.locator('#drum-pads').isVisible());assert.ok(await page.locator('#midi-enable').isHidden());
  const key=page.locator('.piano-key[data-pitch="60"]');await key.focus();await page.keyboard.down('Enter');await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);await page.keyboard.up('Enter');await page.locator('#panic').click();
  // Every optional group remains reachable with native keyboard disclosure controls.
  for(const id of ["saved-mixes","performance"])await page.locator(`.studio-nav a[href="#${id}"]`).click();
  for(const summary of await page.locator('details.studio-options > summary,details.deck-tools > summary').all()){
   const closed=await summary.evaluate(e=>!e.parentElement.open);if(closed){await summary.focus();await page.keyboard.press('Enter');assert.ok(await summary.evaluate(e=>e.parentElement.open));}
  }
  await page.locator('.studio-nav a[href="#headphones"]').click();assert.ok(await page.locator('#cue-refresh').isVisible());
  await page.locator('.studio-nav a[href="#performance"]').click();
  for(const id of ['midi-enable','sequence-start','take-start','set-record-start','scene-restore','recovery-restore','phrase-generate','live-phrases','echo-grid-c','beat-roll-a','keylock-b'])assert.ok(await page.locator('#'+id).isVisible(),id+' reachable');
  const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);
  for(const width of [1440,820,390,320]){
   await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'expanded tools overflow '+width);
  }
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  for(const output of await page.evaluate(()=>__jamloomSilentOutput()))assert.equal(output.peak,0);
  await page.goto(base+'/studio/dj.html#instruments');assert.ok(await page.locator('#load-instruments').isVisible(),'direct links reveal sections');
  await page.locator('#instruments > details > summary').click();await page.locator('.studio-nav a[href="#instruments"]').click();assert.ok(await page.locator('#load-instruments').isVisible(),'same hash reopens section');
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/studio/dj.html');await page.screenshot({path:new URL(name+'-overview.png',evidence).pathname,fullPage:true});await page.locator('.console').screenshot({path:new URL(name+'-decks.png',evidence).pathname});
  await page.locator('.studio-nav a[href="#performance"]').click();await page.locator('#performance').screenshot({path:new URL(name+'-voice.png',evidence).pathname});
  await page.setViewportSize({width:390,height:844});await page.locator('.studio-nav a[href="#decks"]').click();await page.screenshot({path:new URL(name+'-mobile.png',evidence).pathname});
  // A nested Academy target must open itself, including after the learner folds it.
  await page.route('**/api/academy/lesson/first-crossfade',async r=>{const response=await r.fetch();const data=await response.json();data.lesson.tasks[0].control='beat-loop-a';await r.fulfill({json:data});});
  await page.goto(base+'/academy/lessons/first-crossfade');await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});
  assert.ok(await page.locator('#beat-loop-a').isVisible());await page.locator('.deck-a .deck-tools > summary').click();await page.locator('#academy-focus').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'beat-loop-a');assert.ok(await page.locator('#beat-loop-a').isVisible());
  await page.goto(base);await page.setViewportSize({width:1440,height:1000});const platter=page.getByRole('button',{name:'Play Deck A from platter',exact:true});await platter.click();await page.waitForFunction(()=>document.querySelector('.mini-deck audio').currentTime>.2);await page.getByRole('button',{name:'Pause Deck A from platter',exact:true}).click();await page.locator('.mini-deck').screenshot({path:new URL(name+'-homepage-decks.png',evidence).pathname});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.platter-label').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.setViewportSize({width:320,height:640});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',musicLoad:true,keyboardNavigation:true,foldingPreservesPlayback:true,recordingIndicatorAndWav:true,instrumentPlayback:true,allToolsReachable:true,deepLinks:true,nestedAcademyTarget:true,homepagePlayback:true,expandedToolsWidths:[1440,820,390,320],axeViolations:0,outputsMuted:true});
 }finally{await browser.close();}
}
await writeFile(new URL('usability.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
