// Diagnostic browser checks only; no listener judgments or rating fixtures.
import assert from 'node:assert/strict';
import {chromium} from '../apps/site/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4203/';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
try {
 await page.goto(base);
 assert.equal(await page.title(),'Jamloom guitar dynamics diagnostic');
 assert.equal(await page.locator('audio').count(),12);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const durations=await page.locator('audio').evaluateAll(nodes=>Promise.all(nodes.map(n=>new Promise((resolve,reject)=>{
  n.onloadedmetadata=()=>resolve(n.duration);n.onerror=()=>reject(Error('Audio failed'));
  n.preload='metadata';n.load();
 }))));
 assert.ok(durations.every(d=>Math.abs(d-10)<.001));
 await page.locator('audio').evaluateAll(nodes=>nodes.forEach(n=>{n.muted=true;}));
 await page.locator('audio').nth(0).evaluate(n=>n.play());
 await page.waitForFunction(()=>document.querySelectorAll('audio')[0].currentTime>0);
 await page.locator('audio').nth(1).evaluate(n=>n.play());
 await page.waitForFunction(()=>document.querySelectorAll('audio')[1].currentTime>0);
 assert.equal(await page.locator('audio').nth(0).evaluate(n=>n.paused),true);
 await page.locator('audio').nth(1).evaluate(n=>n.pause());
 assert.equal((await page.request.get(base+'organizer-key.json')).status(),404);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await page.screenshot({path:'docs/evidence/q0-guitar-layer/mobile.png'});
 await writeFile('docs/evidence/q0-guitar-layer/browser.json',JSON.stringify({
  technical:'PASS',browser:'Chromium',version:browser.version(),audio_files:12,durations,
  checks:['390px responsive width','all 12 audio metadata decode','muted playback advances',
   'automatic pause','organizer key not served','no page errors or external requests'],
  human_listening:'NOT RUN',physical_output:'NOT RUN',other_browsers:'NOT RUN in this diagnostic'
 },null,2)+'\n');
 console.log('PASS: 12 audio files, playback clock, pause, mobile width, organizer isolation; listening NOT RUN');
} finally {await browser.close();}
