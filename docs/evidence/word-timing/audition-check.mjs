import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {chromium,webkit}=require('playwright');
const results=[];
for (const [name,engine] of Object.entries({chromium,webkit})) {
  const browser=await engine.launch();
  try {
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(process.cwd()+'/renders/word-timing-20261018/review/index.html').href);
    assert.equal(await page.locator('audio').count(),16);
    const players=await page.evaluate(async()=>{
      const result=[];
      for(const a of document.querySelectorAll('audio')) {
        a.muted=true;await a.play();
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(Error('seek timeout')),5000);
          a.onseeked=()=>{clearTimeout(timeout);resolve()};a.currentTime=10;
        });
        if(document.querySelectorAll('audio').length!==16)throw Error('missing players');
        result.push({name:a.getAttribute('aria-label'),duration:a.duration,seek:a.currentTime});a.pause();
      }
      return result;
    });
    assert(players.every(p=>p.duration>=20&&p.duration<=40&&p.seek>=10));assert.deepEqual(errors,[]);
    await page.screenshot({path:`/tmp/djayvo-words-audition-${name}.png`});
    results.push({browser:name,version:browser.version(),gate:'PASS',players,errors,human_listening:'NOT RUN'});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/word-timing/audition-browser.json',JSON.stringify(results,null,2)+'\n');
console.log('PASS: 16 private before/after/instrument/voice players per browser, metadata, muted playback and seek; hearing NOT RUN');
