import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {chromium,webkit}=require('playwright');
// Browser plugin cannot initialize: its required js execution/discovery tools are absent.
const reports=[];
for (const [name,engine] of Object.entries({chromium,webkit})) {
  const output=await fs.mkdtemp(`renders/sustained-instruments-20261018/browser-${name}-`);
  const browser=await engine.launch();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[],requests=[],warnings=[];
    let screenshot=false;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{
      if(m.type()!=='error')return;
      if(name==='webkit'&&screenshot&&m.text().startsWith('Refused to apply a stylesheet'))warnings.push('Playwright screenshot styling blocked by CSP');
      else errors.push(m.text());
    });
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push({url:r.url(),method:r.method()})});
    await page.goto('http://localhost:4173');
    assert.match(await page.title(),/Djayvo/);
    await page.getByRole('heading',{name:'A little voice. A whole new groove.'}).waitFor();
    assert(await page.locator('#generate').isDisabled());
    await page.locator('input[value=funk]').check();
    assert(await page.locator('#generate').isDisabled());
    await page.locator('#consent').check();
    await page.locator('#file').setInputFiles('renders/fixtures/synthetic-speech.wav');
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
    await page.locator('input[value=club]').check();
    await page.locator('#generate').click();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===1,{timeout:90000});
    const oldDownload=await page.locator('.download').getAttribute('download');
    await page.locator('input[value=funk]').check();
    await page.locator('#generate').click();
    await page.locator('#cancel').click();
    assert.equal(await page.locator('.session').count(),1);
    await page.locator('#generate').click();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===2,{timeout:90000});
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
    assert.equal(await page.locator('#error').isVisible(),false,await page.locator('#error').textContent());
    assert.equal(await page.locator('.session').first().locator('h3').textContent(),'Find your pocket');
    const downloadName=await page.locator('.download').first().getAttribute('download');
    assert.match(downloadName,/^djayvo-funk-\d+\.wav$/);
    assert.equal(await page.locator('.download').nth(1).getAttribute('download'),oldDownload);
    // Native audio has no implicit ARIA role across both engines; use its accessible label.
    const player=page.locator('audio[aria-label="Play Funk mix"]');
    assert(await player.evaluate(a=>a.paused));
    await player.evaluate(async a=>{a.muted=true;await a.play()});
    await page.waitForFunction(()=>document.querySelector('audio[aria-label="Play Funk mix"]').currentTime>.1);
    await player.evaluate(a=>{a.pause();a.currentTime=20});
    await page.waitForFunction(()=>{const a=document.querySelector('audio[aria-label="Play Funk mix"]');return !a.seeking&&Math.abs(a.currentTime-20)<.01});
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('link',{name:'Download Funk WAV'}).click();
    const download=await downloadPromise;await download.saveAs(`${output}/download.wav`);
    const wav=await fs.readFile(`${output}/download.wav`);
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert(wav.length>1000000);
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===2);
    assert.equal(await page.locator('#consent').isChecked(),false);
    assert.equal(await page.locator('#trim').isVisible(),false);
    assert.equal(await page.locator('.download').first().getAttribute('download'),downloadName);
    const sessions=await page.evaluate(async()=>{
      const {loadSessions,verifySession}=await import('./library.js');
      const sessions=await loadSessions();
      for(const s of sessions)if(!await verifySession(s))throw Error('Invalid saved session');
      return sessions.map(s=>({style:s.style,seed:s.seed,files:s.files.length}));
    });
    assert.deepEqual(sessions.map(s=>s.style).sort(),['club','funk']);
    await page.locator('#consent').check();
    await page.locator('#file').setInputFiles('renders/fixtures/synthetic-speech.wav');
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
    await page.locator('input[value=funk]').check();await page.locator('#generate').click();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===3,{timeout:90000});
    assert.notEqual(await page.locator('.download').first().getAttribute('download'),downloadName);
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
    await page.waitForTimeout(200);
    screenshot=true;await page.screenshot({path:`/tmp/djayvo-sustained-${name}-desktop.png`});screenshot=false;
    const layouts=[];
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert(!overflow);layouts.push({width,overflow});
    }
    screenshot=true;await page.screenshot({path:`/tmp/djayvo-sustained-${name}-mobile.png`});screenshot=false;
    await page.locator('#direction-title').scrollIntoViewIfNeeded();
    screenshot=true;await page.screenshot({path:`/tmp/djayvo-sustained-${name}-mobile-direction.png`});screenshot=false;
    await page.getByRole('button',{name:'Delete session',exact:true}).first().click();
    await page.locator('#delete-confirm').click();
    await page.waitForFunction(()=>document.querySelectorAll('.session').length===2);
    assert.equal(await page.locator('.download').first().getAttribute('download'),downloadName);
    assert.equal(await page.locator('.download').nth(1).getAttribute('download'),oldDownload);
    assert.deepEqual(errors,[]);
    assert(requests.every(r=>new URL(r.url).origin==='http://localhost:4173'&&r.method==='GET'));
    reports.push({browser:name,version:browser.version(),status:'PASS',url:page.url(),sessions,
      checks:['page identity and content','consent required','cancel preserves existing mixes','real funk generation',
        'muted playback and seek','WAV download','persistent verified library','source and consent not persisted',
        'fresh regeneration seed','scoped deletion preserves previous mixes','no horizontal overflow','no uploads or console errors'],
      desktop:[1440,1000],layouts,errors,warnings,human_listening:'NOT RUN',physical_microphone:'NOT RUN'});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/sustained-instruments/browser.json',JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
