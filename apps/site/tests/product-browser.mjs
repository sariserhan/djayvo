import assert from 'node:assert/strict';
import {silenceSpeakers} from './silent-audio.mjs';
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4220';
assert.equal(new URL(base).hostname,'127.0.0.1');
const evidence=new URL(process.env.JAMLOOM_EVIDENCE_DIR??'../../../docs/evidence/full-product/',import.meta.url),results=[];
await mkdir(evidence,{recursive:true});
const routes=['/','/improvise','/dj-studio','/live-dj','/music-dna','/pricing','/examples','/learn','/learn/voice-remix','/learn/laptop-dj','/learn/live-source','/help','/privacy','/terms','/licenses','/status','/download'];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of routes){
   console.log(name,path);
   const response=await page.goto(base+path);assert.equal(response.status(),200,path);await page.locator('h1').waitFor();
   assert.equal(await page.locator('h1').count(),1,path);
   assert.equal(new URL(await page.locator('link[rel=canonical]').getAttribute('href')).href,new URL('https://www.jamloom.com'+path).href);
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index, follow');
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflow '+width);}
  }
  await page.goto(base+'/');await page.setViewportSize({width:1280,height:1000});
  if(name==='chromium')await page.screenshot({path:new URL('home-desktop.png',evidence).pathname,fullPage:true});
  await page.getByRole('link',{name:'Make a Remix',exact:true}).first().click();await page.waitForURL(base+'/improvise');
  await page.goto(base+'/dj-studio');const structured=JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());assert.equal(structured['@type'],'WebApplication');assert.equal(structured.offers.price,0);assert.equal(structured.aggregateRating,undefined);
  await page.goto(base+'/');await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL(name+'-home-mobile.png',evidence).pathname,fullPage:true});
  const offlineJS=await browser.newContext({javaScriptEnabled:false});const ssr=await offlineJS.newPage();await ssr.goto(base+'/');assert.equal(await ssr.locator('.feature-list article').count(),5);await offlineJS.close();
  await page.goto(base+'/music-dna');await page.getByLabel('Favourite tracks and artists').fill('An original song — a musician');
  await page.getByRole('button',{name:'Save preferences and prepare directions'}).click();assert.match(await page.getByRole('status').innerText(),/Saved on this device/);
  await page.reload();assert.equal(await page.getByLabel('Favourite tracks and artists').inputValue(),'An original song — a musician');
  await page.getByRole('button',{name:'Delete saved profile'}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom-taste-v1')),null);
  await page.goto(base+'/examples');await page.getByLabel('Original instrument study').evaluate(a=>a.load());await page.waitForFunction(()=>document.querySelector('audio[aria-label="Original instrument study"]').readyState>=1);assert.ok(await page.getByLabel('Original instrument study').evaluate(a=>a.duration>10));
  // A real oscillator supplies PCM; only the permission/source chooser is simulated.
  await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{configurable:true,value:async()=>{
   if(window.captureMode==='denied')throw new DOMException('Permission denied','NotAllowedError');
   if(window.captureMode==='silent')return new MediaStream();
   const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain(),dest=context.createMediaStreamDestination();
   osc.frequency.value=4000;gain.gain.value=.2;osc.connect(gain).connect(dest);osc.start();await context.resume();window.testCapture={context,stream:dest.stream};return dest.stream;
  }});});
  await page.goto(base+'/live-dj');await page.setViewportSize({width:1280,height:1000});
  const live=page.locator('section').filter({has:page.getByRole('heading',{name:'Browser Live Source',exact:true})});
  assert.ok(await live.getByRole('button',{name:'Select tab audio'}).isDisabled());
  await page.getByLabel('I have permission').check();await page.getByRole('button',{name:'Select tab audio'}).click();
  await page.waitForFunction(()=>!document.querySelectorAll('.product-controls')[1].querySelector('button').textContent.includes('Waiting'));
  const captureTracks=await page.evaluate(()=>window.testCapture?.stream.getAudioTracks().length??0);
  if(captureTracks){
  assert.match(await live.locator('output').innerText(),/silent/);
  await page.getByLabel('I have confirmed').check();await page.waitForFunction(()=>/−|\-/.test(document.querySelector('output').textContent));
  const peak=()=>live.locator('output').innerText().then(t=>Number(t.match(/(-?[\d.]+) dBFS/)?.[1]??-100));
  const loud=await peak();assert.ok(loud>-35&&loud<-10);
  await page.getByLabel('Low-pass tone').focus();await page.getByLabel('Low-pass tone').press('Home');await page.waitForTimeout(400);
  assert.ok(await peak()<loud-15);
  await page.getByLabel('Bypass effects').check();await page.waitForTimeout(400);assert.ok(Math.abs(await peak()-loud)<3);
  await page.getByRole('button',{name:'Stop capture / panic'}).click();assert.ok(await page.evaluate(()=>window.testCapture.stream.getTracks().every(t=>t.readyState==='ended')));
  }else assert.match(await live.locator('[role=status]').innerText(),/supplied no audio/);
  for(const mode of ['denied','silent']){await page.evaluate(m=>window.captureMode=m,mode);await page.getByRole('button',{name:'Select tab audio'}).click();await page.waitForFunction(()=>!document.querySelectorAll('[role=status]')[1].textContent.includes('Capture active'));assert.ok(await page.getByRole('button',{name:'Select tab audio'}).isEnabled());}
  await page.screenshot({path:new URL(name+'-live-source.png',evidence).pathname,fullPage:true});
  assert.deepEqual(errors,[]);
  assert.equal((await context.request.post(base+'/api/payments/checkout')).status(),503);
  assert.equal((await context.request.get(base+'/opengraph-image')).status(),200);
  const sitemap=await (await context.request.get(base+'/sitemap.xml')).text();assert.ok(!sitemap.includes('/account'));for(const path of routes)assert.ok(sitemap.includes('https://www.jamloom.com'+path));
  results.push({browser:name,version:browser.version(),routes:routes.length,widths:[1440,390,320],SSR:'PASS',taste_storage:'PASS',audio_demo_decode:'PASS',synthetic_capture_PCM_filter_bypass_stop:captureTracks?'PASS':'NOT RUN: headless WebKit destination supplied zero audio tracks',permission_simulation:'PASS',real_capture_permission:'NOT RUN',human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
