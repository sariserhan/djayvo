import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {chromium,webkit}=require('playwright');
const base='http://127.0.0.1:4194';
const range=await fetch(base+'/review/owner-4123-after.wav',{headers:{Range:'bytes=0-43'}});
assert.equal(range.status,206);assert.match(range.headers.get('content-range'),/^bytes 0-43\//);
assert.equal((await range.arrayBuffer()).byteLength,44);
const suffix=await fetch(base+'/review/owner-4123-after.wav',{headers:{Range:'bytes=-100'}});
assert.equal(suffix.status,206);assert.equal((await suffix.arrayBuffer()).byteLength,100);
for(const path of ['/.env.local','/before/djayvo_remix','/after/','/review/../before/djayvo_remix'])
  assert.equal((await fetch(base+path)).status,404);
assert.equal((await fetch(base+'/review/',{method:'POST'})).status,405);
assert.equal((await fetch(base+'/review/',{method:'HEAD'})).status,200);
// Browser plugin execution tool unavailable; use the existing isolated test fallback.
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
  const output=await fs.mkdtemp(`renders/source-contour-20261019/ui-${name}-`);
  const browser=await engine.launch();
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
    await page.goto('http://127.0.0.1:4194/review/');
    await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1));
    assert.equal(await page.title(),'Djayvo pitch contour comparisons');
    assert.equal(await page.locator('audio').count(),20);
    for(const seed of [4123,4124,4125,4126]) {
      const after=page.locator(`audio[aria-label="owner-${seed} after"]`);
      const before=page.locator(`audio[aria-label="owner-${seed} before"]`);
      await after.evaluate(async a=>{a.muted=true;await Promise.race([a.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback timed out')),10000))]);a.currentTime=12});
      await page.waitForFunction(label=>document.querySelector(`audio[aria-label="${label}"]`).currentTime>=12,`owner-${seed} after`);
      await before.evaluate(async a=>{a.muted=true;await Promise.race([a.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback timed out')),10000))]);a.currentTime=28});
      await page.waitForFunction(label=>document.querySelector(`audio[aria-label="${label}"]`).currentTime>=28,`owner-${seed} before`);
      assert.equal(await after.evaluate(a=>a.paused),true);
      assert(await before.evaluate(a=>a.duration>30 && a.duration<40));
      await before.evaluate(a=>a.pause());
    }
    await page.screenshot({path:output+'/desktop.png',fullPage:true});
    await page.setViewportSize({width:375,height:812});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:output+'/mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    assert(requests.every(r=>(r.url.startsWith(base+'/') || r.url.startsWith('blob:'+base+'/')) && r.method==='GET'));
    results.push({browser:name,version:browser.version(),status:'PASS',players:20,pairs:4,rangeDelivery:'PASS',privatePathIsolation:'PASS',mutedPlaybackSeekAndExclusivity:'PASS',mobileOverflow:'PASS',errors,requests:requests.length,screenshots:output});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/source-contour/review-browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
