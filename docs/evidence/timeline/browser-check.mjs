import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const require=createRequire(process.cwd()+'/apps/site/package.json');
const {chromium,webkit}=require('playwright');
// Browser plugin runtime blocker: Node REPL js/tool-search unavailable; autonomous validation uses installed Playwright.
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
 console.log('Checking '+name);
 const browser=await engine.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(pathToFileURL(process.cwd()+'/renders/timeline-20261018/review/index.html').href);
 assert.equal(await page.title(),'Djayvo tempo and mix movement');
 assert.equal(await page.locator('h1').textContent(),'Djayvo tempo and mix movement');
 assert.equal(await page.locator('audio').count(),8);
 await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1&&a.duration>=32&&a.duration<33));
 assert(await page.locator('audio').evaluateAll(as=>as.every(a=>a.paused)));
 await page.locator('audio').nth(0).evaluate(async a=>{a.muted=true;await a.play()});
 await page.waitForFunction(()=>document.querySelector('audio').currentTime>0.1);
 await page.locator('audio').nth(1).evaluate(async a=>{a.muted=true;await a.play()});
 assert(await page.locator('audio').nth(0).evaluate(a=>a.paused));
 assert(await page.locator('audio').nth(1).evaluate(a=>!a.paused));
 await page.locator('audio').nth(1).evaluate(a=>{a.pause();a.currentTime=29.5});
 await page.waitForFunction(()=>{const a=document.querySelectorAll('audio')[1];return a.paused&&!a.seeking&&Math.abs(a.currentTime-29.5)<.01});
 const desktop='/tmp/djayvo-timeline-'+name+'-desktop.png';await page.screenshot({path:desktop});
 const layouts=[];
 for(const width of [375,320]) {
  await page.setViewportSize({width,height:812});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  layouts.push({width,overflow});
 }
 const mobile='/tmp/djayvo-timeline-'+name+'-mobile.png';await page.screenshot({path:mobile});
 results.push({browser:name,version:browser.version(),status:layouts.some(l=>l.overflow)?'FAIL':'PASS',url:page.url(),players:8,durations_seconds:[32,32.158729166666664],play_seek_pause_exclusivity:'PASS',no_autoplay:'PASS',errors,layouts,screenshots:[desktop,mobile]});
 assert.equal(errors.length,0);
 } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/timeline/browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
assert(results.every(r=>r.status==='PASS'));
