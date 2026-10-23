import assert from 'node:assert/strict';
import {mkdtemp,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4235';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=await mkdtemp(join(tmpdir(),'jamloom-windows-')),checks=[];console.log('Evidence:',output);
for(const [name,engine] of Object.entries({chromium,webkit})){
 console.log('Browser:',name);const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000}});await context.addInitScript(silenceSpeakers);
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.goto(base+'/studio/dj.html#pro-demo');await page.locator('#detach-deck').waitFor({state:'attached'});
  await page.locator('.studio-window-tools > summary').click();
  const detach=async id=>{await page.bringToFront();const opened=context.waitForEvent('page');await page.locator('#detach-'+id).click();const child=await opened;child.setDefaultTimeout(15000);await child.locator('#detached-content > :first-child').waitFor();return child;};
  await page.locator('.studio-nav a[href="#saved-mixes"]').click();await page.locator('#practice-track').selectOption('funked-up');await page.locator('#practice-load-a').click();await page.waitForFunction(()=>document.getElementById('state-a').textContent==='Ready');
  await page.locator('#play-a').click();await page.waitForFunction(()=>document.getElementById('state-a').textContent==='Playing').catch(async error=>{console.log('Playback start',await page.locator('#error-a').textContent(),await page.locator('#mixer-status').textContent(),errors);throw error;});
  const deck=await detach('deck');assert.match(await deck.title(),/Full deck/);assert.equal(await page.locator('#audio-a').count(),1);assert.equal(await deck.locator('#audio-a').count(),0);
  await deck.waitForFunction(()=>document.getElementById('state-a').textContent==='Playing');const position=Number(await deck.locator('#seek-a').inputValue());await deck.waitForFunction(p=>Number(document.getElementById('seek-a').value)>p+.3,position);
  await deck.locator('#crossfade').fill('0.4');assert.match(await deck.locator('#blend-value').textContent(),/A 60%/);
  const keys=await detach('keys'),pads=await detach('pads');assert.equal(context.pages().length,4);assert.equal(await keys.locator('#drum-pads').count(),0);assert.equal(await pads.locator('.drum-pad').count()>0,true);
  await keys.bringToFront();await keys.locator('#load-instruments').click();await keys.waitForFunction(()=>document.getElementById('load-instruments').textContent==='Instruments ready');
  await keys.locator('#keyboard').locator('[data-pitch="60"]').focus();await keys.keyboard.down('a');await keys.waitForFunction(()=>document.querySelector('[data-pitch="60"]').getAttribute('aria-pressed')==='true');
  await pads.bringToFront();await keys.keyboard.up('a');await keys.waitForFunction(()=>document.querySelector('[data-pitch="60"]').getAttribute('aria-pressed')==='false');
  await pads.locator('.drum-pad').first().focus();await pads.keyboard.down('Space');assert.equal(await pads.locator('.drum-pad').first().getAttribute('aria-pressed'),'true');await pads.keyboard.up('Space');
  await keys.bringToFront();await keys.locator('#patch').selectOption('11');await keys.locator('#mouth').fill('0.8');assert.equal(await keys.locator('#mouth-value').innerText(),'EE');
  await keys.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
  await keys.locator('#take-consent').check();await keys.locator('#take-start').click();await keys.waitForFunction(()=>!document.getElementById('take-stop').disabled);
  await pads.bringToFront();await pads.locator('.drum-pad').first().focus();await pads.keyboard.down('Space');await pads.waitForTimeout(250);await pads.keyboard.up('Space');
  await keys.bringToFront();await keys.locator('#take-stop').click();await keys.locator('#take-wav').waitFor({state:'visible'});
  const savedTake=keys.waitForEvent('download');await keys.locator('#take-wav').click();const download=await savedTake;assert.equal(await download.failure(),null);assert.ok((await stat(await download.path())).size>44);
  await keys.locator('#take-delete').click();
  await keys.locator('#sequence-step-0').selectOption('60');await keys.locator('#sequence-start').click();await keys.waitForFunction(()=>!document.getElementById('sequence-stop').disabled);
  await pads.bringToFront();await pads.waitForTimeout(150);assert.equal(await keys.locator('#sequence-stop').isDisabled(),false);await keys.locator('#sequence-stop').click();
  await deck.bringToFront();await deck.locator('#play-a').click();await deck.locator('#pro-prepare-a').click();await deck.waitForFunction(()=>document.getElementById('pro-prepare-a').textContent==='Waveform ready');await deck.locator('#hot-a-7').click();assert.doesNotMatch(await deck.locator('#hot-a-7').innerText(),/EMPTY/);
  await deck.locator('#play-a').click();await deck.waitForFunction(()=>Number(document.getElementById('output-meter').value)>0);
  await keys.close();await page.waitForFunction(()=>!!document.getElementById('keyboard'));assert.equal(await pads.locator('.drum-pad').count()>0,true);
  await pads.locator('#detached-return').click();await page.waitForFunction(()=>!!document.getElementById('drum-pads'));assert.equal(await page.locator('#patch').inputValue(),'11');
  // Detach in the opposite nesting order and return pads while keys remain detached.
  const pads2=await detach('pads'),keys2=await detach('keys');await pads2.locator('#detached-return').click();await keys2.waitForFunction(()=>!!document.getElementById('drum-pads'));
  await keys2.screenshot({path:join(output,name+'-keys.png')});await deck.screenshot({path:join(output,name+'-deck.png')});
  const scan=await new AxeBuilder({page:deck}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.bringToFront();await page.getByRole('button',{name:'Return all tools',exact:true}).click();await page.waitForFunction(()=>!!document.getElementById('play-a')&&!!document.getElementById('keyboard'));await page.waitForFunction(()=>document.getElementById('state-a').textContent==='Playing');await page.locator('#pause-all').click();
  // Browser popup rejection preserves every control and gives a useful recovery message.
  await page.evaluate(()=>{window.savedOpen=window.open;window.open=()=>null;});await page.locator('#detach-deck').click();assert.match(await page.locator('#studio-windows-status').innerText(),/Allow pop-up/);assert.equal(await page.locator('#play-a').count(),1);await page.evaluate(()=>window.open=window.savedOpen);
  const sampler=await detach('sampler');await sampler.locator('#sample-consent').check();await sampler.locator('#sample-demo').click();await sampler.waitForFunction(()=>document.querySelector('#sample-pad-0 small').textContent==='Practice sound.wav');await sampler.locator('#sample-pad-0').click();await sampler.waitForFunction(()=>document.getElementById('sample-pad-0').dataset.playing==='true');
  const voice=await detach('voice'),headphones=await detach('headphones');assert.equal(await voice.locator('#phrase-demo').isVisible(),true);assert.equal(await headphones.locator('#headphones').isVisible(),true);
  await page.reload();await page.locator('#detach-deck').waitFor({state:'attached'});await page.waitForFunction(()=>document.getElementById('state-a').textContent==='Empty');assert.ok(sampler.isClosed()&&voice.isClosed()&&headphones.isClosed());
  await page.goto(base+'/studio/dj.html#basic');await page.reload();await page.locator('#detach-deck').waitFor({state:'attached'});await page.locator('.studio-window-tools > summary').click();const basicKeys=await detach('keys');assert.equal(await basicKeys.locator('#load-instruments').isDisabled(),true);
  // A synthetic event must not bypass access after moving a restricted control.
  await basicKeys.locator('#load-instruments').evaluate(el=>{el.disabled=false;el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});await basicKeys.waitForFunction(()=>document.getElementById('load-instruments').disabled);assert.equal(await basicKeys.locator('#load-instruments').innerText(),'Enable instruments');
  await basicKeys.locator('#detached-return').click();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(output,name+'-mobile.png')});
  // Hiding microphone controls cancels even while another studio tool is visible.
  await context.route('**/api/pro/access',route=>route.fulfill({json:{active:true}}));
  await page.goto(base+'/studio/dj.html#pro');await page.reload();await page.locator('#detach-deck').waitFor({state:'attached'});await page.locator('.studio-window-tools > summary').click();
  await page.evaluate(()=>{window.stoppedTracks=0;navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.finishMicPermission=()=>resolve({getTracks:()=>[{stop(){window.stoppedTracks++;}}]}));});
  const capture=await detach('voice'),visibleDeck=await detach('deck');await capture.locator('#phrase-consent').check();await capture.locator('#phrase-record').click();await page.waitForFunction(()=>typeof window.finishMicPermission==='function');
  await capture.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.evaluate(()=>window.finishMicPermission());await page.waitForFunction(()=>window.stoppedTracks===1);assert.equal(await capture.locator('#phrase-record').innerText(),'Record phrase');assert.equal(visibleDeck.isClosed(),false);
  await capture.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await capture.locator('#phrase-record').click();await capture.waitForFunction(()=>document.getElementById('phrase-record').disabled);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await capture.locator('#detached-return').click();await page.evaluate(()=>window.finishMicPermission());await page.waitForFunction(()=>window.stoppedTracks===2);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));

  assert.deepEqual(errors,[]);checks.push({browser:name,status:'PASS',multipleWindows:3,playback:'native and buffered, muted',nestedReturn:true,instrumentRecordingAcrossWindows:true,sequenceAcrossWindows:true,microphoneVisibility:true,access:true,popupBlocked:true,errors});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({output,checks},null,2));
