import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/apps/site/package.json');
const {chromium,webkit}=require('playwright');
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4197/');
  assert.equal(await page.title(),'Jamloom · a musical conversation');
  assert.equal(await page.locator('h1').textContent(),'A musical conversation.');
  assert.equal(await page.locator('audio').count(),3);
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1));
  const durations=await page.locator('audio').evaluateAll(as=>as.map(a=>a.duration));
  assert.equal(durations[0],30);assert.equal(durations[1],30);assert(Math.abs(durations[2]-1.96)<.01);
  assert(await page.locator('audio').evaluateAll(as=>as.every(a=>a.paused)));
  for(let i=0;i<3;i++) {
   await page.locator('audio').nth(i).evaluate(async a=>{a.muted=true;await a.play()});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.1,i);
   assert.equal(await page.locator('audio').evaluateAll(as=>as.filter(a=>!a.paused).length),1);
  }
  await page.locator('audio').evaluateAll(as=>as.forEach(a=>a.pause()));
  await page.locator('audio').first().evaluate(a=>a.currentTime=20);
  await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.seeking&&Math.abs(a.currentTime-20)<.01});
  for(const link of await page.locator('a[download]').all()) {
   const response=await page.request.get('http://127.0.0.1:4197/'+await link.getAttribute('href'),{headers:{Range:'bytes=0-99'}});
   assert.equal(response.status(),206);assert.equal((await response.body()).length,100);
  }
  await page.screenshot({path:`docs/evidence/source-led-response/${name}-desktop.png`});
  for(const width of [375,320]) {
   await page.setViewportSize({width,height:812});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.screenshot({path:`docs/evidence/source-led-response/${name}-mobile.png`});
  await page.getByRole('link',{name:'Earlier style comparisons'}).click();
  assert.equal(await page.locator('audio').count(),12);
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1&&a.duration===30));
  assert.equal(errors.length,0);
  results.push({browser:name,version:browser.version(),status:'PASS',durations_seconds:durations,
   muted_play_seek_exclusivity:'PASS',downloads_range_206:'PASS',previous_players:12,
   no_autoplay:'PASS',mobile_widths:[375,320],errors});
 } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/source-led-response/browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
