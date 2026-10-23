import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4224';
assert.equal(new URL(base).hostname,'127.0.0.1');
const evidence=new URL(process.env.JAMLOOM_TEST_EVIDENCE??'../../../docs/evidence/studio-fullscreen/',import.meta.url),results=[];
await mkdir(evidence,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/academy/lessons/first-crossfade');await page.locator('#academy-load').waitFor();
  const button=page.locator('#studio-fullscreen');await button.click();await page.waitForFunction(()=>document.querySelector('.studio-expanded'));assert.ok(await page.locator('.academy-coach').isVisible(),'preparation remains available before loading');
  await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});
  await button.click();await page.waitForFunction(()=>!document.querySelector('.studio-expanded'));
  await page.locator('#play-a').click();await page.waitForFunction(()=>Number(document.querySelector('#seek-a').value)>.3);
  const source=await page.locator('#name-a').innerText(),time=await page.locator('#seek-a').evaluate(a=>Number(a.value));
  await button.click();await page.waitForFunction(()=>document.querySelector('#dj').classList.contains('studio-expanded'));
  const native=await page.evaluate(()=>document.fullscreenElement?.id==='dj');
  assert.ok(await page.locator('.academy-coach').isHidden());await page.locator('#studio-coaching').click();assert.ok(await page.locator('.academy-coach').isVisible());await page.locator('#studio-coaching').click();assert.ok(await page.locator('.academy-coach').isHidden());
  assert.equal(await button.getAttribute('aria-pressed'),'true');assert.ok(await page.locator('body > header').evaluate(e=>e.inert));
  await page.waitForTimeout(300);assert.ok(await page.locator('#seek-a').evaluate(a=>Number(a.value))>time);assert.equal(await page.locator('#name-a').innerText(),source);
  await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
  await button.click();await page.waitForFunction(()=>!document.querySelector('#dj').classList.contains('studio-expanded'));
  const layouts=[];
  for(const [width,height] of [[3840,2160],[2560,1440],[1920,1080],[1440,900],[1366,768],[1024,768],[844,390],[390,844],[320,640]]){
   await page.setViewportSize({width,height});await button.click();await page.waitForFunction(()=>document.querySelector('#dj').classList.contains('studio-expanded'));
   const layout=await page.evaluate(()=>{
    const root=document.querySelector('#dj');root.scrollTop=0;
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {width:innerWidth,height:innerHeight,overflow:root.scrollWidth>root.clientWidth,expanded:root.classList.contains('studio-expanded'),console:rect('.console'),c:rect('#performance'),instruments:rect('#instruments'),notes:rect('#session-notes'),pad:rect('#hot-b-3'),button:rect('#studio-fullscreen')};
   });
   assert.ok(layout.console.height>500,'console must retain its full height');
   assert.ok(layout.instruments.y>=layout.console.bottom,'instruments cannot overlap decks');
   assert.ok(layout.notes.y>=layout.console.bottom,'notes must follow the decks');
   if(width>=1100&&height>=768)assert.ok(layout.pad.bottom<=height,name+' all transport and pads fit '+width+'x'+height+' '+JSON.stringify(layout.pad));
   assert.ok(layout.expanded);assert.ok(!layout.overflow,`${name} ${width} overflow`);
   assert.ok(layout.button.y>=0&&layout.button.bottom<=height,`${name} ${width} exit visible`);
   if(width>=1900){assert.ok(layout.c.x>=layout.console.right);assert.ok(Math.abs(layout.c.y-layout.console.y)<2);}
   else assert.ok(layout.c.y>=layout.console.bottom);
   layouts.push({width,height,extraDeckBesideMixer:width>=1900,gate:'PASS'});
   if([1920,1366,390].includes(width))await page.screenshot({path:new URL(name+'-'+width+'.png',evidence).pathname});
   await button.click();await page.waitForFunction(()=>!document.querySelector('#dj').classList.contains('studio-expanded'));
  }
  await page.setViewportSize({width:1920,height:1080});await button.click();await page.waitForFunction(()=>document.querySelector('#dj').classList.contains('studio-expanded'));
  await page.locator('#dj').evaluate(e=>e.scrollTop=1500);const toolbar=await button.boundingBox();assert.ok(toolbar.y>=0&&toolbar.y+toolbar.height<1080,'exit stays visible while scrolling');
  await button.click();await page.waitForFunction(()=>!document.querySelector('#dj').classList.contains('studio-expanded'));
  assert.ok(await page.locator('.academy-coach').isVisible());assert.ok(!await page.locator('body > header').evaluate(e=>e.inert));
  assert.equal(await button.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#name-a').innerText(),source);assert.ok(await page.locator('.deck-a').evaluate(a=>a.dataset.playing==='true'));
  if(native){
   await button.click();await page.waitForFunction(()=>document.fullscreenElement?.id==='dj');
   await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.querySelector('#dj').classList.contains('studio-expanded'));
   assert.equal(await button.getAttribute('aria-pressed'),'false');
  }
  // Browser refusal must leave usable controls and an explicit in-page fallback.
  await page.locator('#dj').evaluate(e=>{e.requestFullscreen=async()=>{throw new DOMException('Denied','NotAllowedError');};Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});});
  await button.click();assert.match(await page.locator('#studio-view-status').innerText(),/unavailable/);assert.equal(await page.locator('#dj').getAttribute('data-studio-view'),'expanded');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#dj').classList.contains('studio-expanded'));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'studio-fullscreen');
  // Missing API follows the same responsive layout without claiming native fullscreen.
  await page.locator('#dj').evaluate(e=>{e.requestFullscreen=undefined;});await button.click();assert.equal(await button.innerText(),'Exit expanded view');await button.click();assert.equal(await button.innerText(),'Expand studio');
  await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/);
  await page.goto(base+'/studio/dj.html');await button.click();await page.waitForFunction(()=>document.querySelector('.studio-expanded'));assert.ok(await page.locator('#studio-coaching').isHidden());await button.click();await page.waitForFunction(()=>!document.querySelector('.studio-expanded'));
  assert.deepEqual(errors,[]);
  results.push({browser:name,version:browser.version(),nativeFullscreen:native?'PASS':'NOT RUN: browser used expanded fallback',layouts,playbackSurvivesEntryExit:'PASS',nativeExitEvent:native?'PASS':'NOT RUN',rejectionFallback:'PASS',missingApiFallback:'PASS',escapeFallback:'PASS',keyboardFocus:'PASS',coachingAndLessonState:'PASS',standaloneStudio:'PASS',accessibility:'PASS',errors});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
