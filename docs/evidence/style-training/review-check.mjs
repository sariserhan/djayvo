import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {chromium,webkit}=require('playwright');
const base='http://127.0.0.1:4193';
const range=await fetch(base+'/review/pair-1-A.wav',{headers:{Range:'bytes=0-43'}});
assert.equal(range.status,206);
assert.match(range.headers.get('content-range'),/^bytes 0-43\//);
assert.equal((await range.arrayBuffer()).byteLength,44);
for(const path of ['/.env.local','/blind-key-private.json','/results/comparison.json','/headroom/x-01.wav','/review/../results/base-bass-a.wav'])
  assert.equal((await fetch(base+path)).status,404);
assert.equal((await fetch(base+'/review/',{method:'POST'})).status,405);
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
  const output=await fs.mkdtemp(`renders/style-training-20261018/ui-${name}-`);
  const browser=await engine.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
    await page.goto(base+'/review/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1));
    assert.equal(await page.title(),'Djayvo adapter trial');
    assert.equal(await page.locator('audio').count(),8);
    for(let pair=1;pair<=4;pair++) {
      const a=page.locator(`audio[aria-label="Pair ${pair} version A"]`);
      const b=page.locator(`audio[aria-label="Pair ${pair} version B"]`);
      for(const player of [a,b]) {
        await player.evaluate(async a=>{a.muted=true;await Promise.race([a.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback timed out')),10000))]);a.currentTime=25});
        await page.waitForFunction(label=>document.querySelector(`audio[aria-label="${label}"]`).currentTime>=25,await player.getAttribute('aria-label'));
        assert.equal(await player.evaluate(a=>a.duration),30);
      }
      assert.equal(await a.evaluate(a=>a.paused),true);
      await b.evaluate(a=>a.pause());
    }
    await page.screenshot({path:output+'/desktop.png',fullPage:true});
    await page.setViewportSize({width:375,height:812});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:output+'/mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    assert(requests.every(r=>(r.url.startsWith(base+'/') || r.url.startsWith('blob:'+base+'/')) && r.method==='GET'));
    results.push({browser:name,version:browser.version(),status:'PASS',players:8,pairs:4,rangeDelivery:'PASS',privatePathIsolation:'PASS',mutedPlaybackSeekAndExclusivity:'PASS',mobileOverflow:'PASS',errors,screenshots:output,humanListening:'NOT RUN'});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/style-training/review-browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
