import assert from 'node:assert/strict';
import {chromium,webkit} from '../../../apps/site/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4212')external.push(r.url());});
  await page.goto('http://127.0.0.1:4212/');
  await page.waitForFunction(()=>document.querySelector('audio').readyState>=1);
  assert.ok(await page.locator('audio').evaluate(a=>a.duration>120&&a.duration<122));
  await page.locator('audio').evaluate(a=>{a.muted=true;});
  await page.getByRole('button',{name:'First drop · 0:27'}).click();
  await page.waitForFunction(()=>document.querySelector('audio').readyState>=2);
  await page.waitForFunction(()=>!document.querySelector('audio').seeking && Math.abs(document.querySelector('audio').currentTime-27.428571)<2);
  const advanced=await page.locator('audio').evaluate(async a=>{const old=a.currentTime;await new Promise(r=>setTimeout(r,400));return a.currentTime>old;});
  await page.locator('audio').evaluate(a=>a.pause());
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.screenshot({path:`docs/evidence/night-current/${name}-mobile.png`});
  for(const format of ['WAV','MP3']){
   const pending=page.waitForEvent('download');await page.getByRole('link',{name:`Download ${format}`,exact:true}).click();
   const download=await pending;assert.equal(download.suggestedFilename(),`Night Current.${format.toLowerCase()}`);await download.delete();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({browser:name,version:browser.version(),decode_seek_download_layout:'PASS',muted_clock:advanced?'PASS':'PARTIAL',human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile('docs/evidence/night-current/browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
