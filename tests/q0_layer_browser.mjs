// Diagnostic browser checks only; no listener judgments or rating fixtures.
import assert from 'node:assert/strict';
import {chromium} from '../apps/site/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const base=process.env.Q0_REVIEW_URL||'http://127.0.0.1:4203/';
const out=process.env.Q0_EVIDENCE_DIR||'docs/evidence/q0-guitar-layer';
const accents=process.env.Q0_ACCENT_REVIEW==='1';
assert.equal(new URL(base).hostname,'127.0.0.1');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
try {
 await page.goto(base);
 assert.equal(await page.title(),accents?'Jamloom guitar accent comparison':'Jamloom guitar dynamics diagnostic');
 assert.equal(await page.locator('audio').count(),accents?3:12);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const durations=await page.locator('audio').evaluateAll(nodes=>Promise.all(nodes.map(n=>new Promise((resolve,reject)=>{
  n.onloadedmetadata=()=>resolve(n.duration);n.onerror=()=>reject(Error('Audio failed'));
  n.preload='metadata';n.load();
 }))));
 if(accents) {
  assert.ok(durations[0]>=2&&durations[0]<=5);
  assert.ok(durations[1]>=20&&durations[1]<=40);
  assert.equal(durations[1],durations[2]);
 } else assert.ok(durations.every(d=>Math.abs(d-10)<.001));
 await page.locator('audio').evaluateAll(nodes=>nodes.forEach(n=>{n.muted=true;}));
 const first=accents?1:0;
 await page.locator('audio').nth(first).evaluate(n=>n.play());
 await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>0,first);
 await page.locator('audio').nth(first+1).evaluate(n=>n.play());
 await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>0,first+1);
 assert.equal(await page.locator('audio').nth(first).evaluate(n=>n.paused),true);
 await page.locator('audio').nth(first+1).evaluate(n=>n.pause());
 assert.equal((await page.request.get(base+'organizer-key.json')).status(),404);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await page.screenshot({path:join(out,'mobile.png')});
 await writeFile(join(out,'browser.json'),JSON.stringify({
  technical:'PASS',browser:'Chromium',version:browser.version(),audio_files:durations.length,durations,
  checks:['390px responsive width','all audio metadata decode','muted playback advances',
   'automatic pause','organizer key not served','no page errors or external requests'],
  human_listening:'NOT RUN',physical_output:'NOT RUN',other_browsers:'NOT RUN in this diagnostic'
 },null,2)+'\n');
 console.log(`PASS: ${durations.length} audio files, playback clock, pause, mobile width, organizer isolation; listening NOT RUN`);
} finally {await browser.close();}
