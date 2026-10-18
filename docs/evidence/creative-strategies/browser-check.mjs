import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {chromium,webkit}=require('playwright');
// Browser plugin execution tools are unavailable; isolated Playwright is the local fallback.
const results=[];
for (const [name,engine] of Object.entries({chromium,webkit})) {
  const output=await fs.mkdtemp(`renders/creative-strategies-20261018/ui-${name}-`);
  const browser=await engine.launch();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[],requests=[];let screenshot=false;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!(name==='webkit'&&screenshot&&m.text().startsWith('Refused to apply a stylesheet')))errors.push(m.text())});
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push({url:r.url(),method:r.method()})});
    await page.goto('http://localhost:4173');
    assert(await page.locator('#generate').isDisabled());
    await page.locator('#consent').check();
    await page.locator('#file').setInputFiles('renders/fixtures/synthetic-speech.wav');
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
    for (const [i,style] of ['call_response','hybrid'].entries()) {
      await page.locator(`input[value=${style}]`).check();
      await page.locator('#generate').click();
      await page.locator('#cancel').click();
      assert.equal(await page.locator('.session').count(),i);
      await page.locator('#generate').click();
      await page.waitForFunction(n=>document.querySelectorAll('.session').length===n,i+1,{timeout:90000});
      await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
      assert.equal(await page.locator('#error').isVisible(),false,await page.locator('#error').textContent());
      assert.match(await page.locator('.download').first().getAttribute('download'),new RegExp(`^djayvo-${style}-\\d+\\.wav$`));
    }
    const player=page.locator('.session audio').first();
    await player.evaluate(async a=>{a.muted=true;await a.play()});
    await page.waitForFunction(()=>document.querySelector('.session audio').currentTime>.1);
    await player.evaluate(a=>{a.pause();a.currentTime=20});
    await page.waitForFunction(()=>{const a=document.querySelector('.session audio');return !a.seeking&&Math.abs(a.currentTime-20)<.01});
    const download=page.waitForEvent('download');await page.locator('.download').first().click();
    await (await download).saveAs(`${output}/download.wav`);
    assert.equal((await fs.readFile(`${output}/download.wav`)).toString('ascii',0,4),'RIFF');
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.session').length===2);
    assert.equal(await page.locator('#consent').isChecked(),false);
    const sessions=await page.evaluate(async()=>{
      const {loadSessions,verifySession}=await import('./library.js');
      const {compositionKey}=await import('./novelty.js');
      const sessions=await loadSessions();
      for(const s of sessions)if(!await verifySession(s))throw Error('Invalid session');
      return Promise.all(sessions.map(async s=>({style:s.style,seed:s.seed,
        key:await compositionKey(JSON.parse(await s.files.find(f=>f.name.endsWith('.score.json')).blob.text()))})));
    });
    assert.deepEqual(sessions.map(s=>s.style).sort(),['call_response','hybrid']);
    // Force the first seed to repeat; verify actual worker retries and exported seed agree.
    const input=Array.from(await fs.readFile('renders/fixtures/synthetic-speech.wav'));
    const retry=await page.evaluate(async({input})=>{
      const {compositionKey}=await import('./novelty.js');
      const run=recent=>new Promise((resolve,reject)=>{
        const worker=new Worker('./engine-worker.js',{type:'module'});
        const timer=setTimeout(()=>{worker.terminate();reject(Error('timeout'))},90000);
        worker.onmessage=({data})=>{if(data.type==='rendering')return;clearTimeout(timer);worker.terminate();resolve(data)};
        worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('worker error'))};
        worker.postMessage({wav:new Uint8Array(input).buffer,style:'hybrid',seed:4123,recent,consent:true});
      });
      const first=await run([]);if(first.type!=='complete')throw Error(first.message);
      const plan=data=>JSON.parse(new TextDecoder().decode(data.files.find(f=>f.name.endsWith('.score.json')).bytes));
      const key=await compositionKey(plan(first));
      const second=await run([key]);if(second.type!=='complete')throw Error(second.message);
      if(second.attempts<2 || second.seed!==plan(second).seed || await compositionKey(plan(second))===key)throw Error('repeat not avoided');
      return {first_seed:first.seed,selected_seed:second.seed,attempts:second.attempts};
    },{input});
    screenshot=true;await page.screenshot({path:`/tmp/djayvo-creative-${name}-desktop.png`});screenshot=false;
    for(const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('#styles').scrollIntoViewIfNeeded();
      screenshot=true;await page.screenshot({path:`/tmp/djayvo-creative-${name}-${width}.png`});screenshot=false;
    }
    await page.locator('.session').first().getByRole('button',{name:'Delete session'}).click();
    await page.locator('#delete-confirm').click();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===1);
    assert.equal(await page.locator('.session').count(),1);await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===1);
    assert.deepEqual(errors,[]);
    assert(requests.every(r=>r.url.startsWith('http://localhost:4173/')&&r.method==='GET'));
    results.push({browser:name,version:browser.version(),gate:'PASS',sessions,retry,errors,requests:requests.length,output});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/creative-strategies/browser.json',JSON.stringify(results,null,2)+'\n');
console.log('PASS: both new directions, consent, cancel, persistence, playback, seek, downloads, deletion, forced repeat retry and mobile overflow');
