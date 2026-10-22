import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/apps/site/package.json');
const {chromium}=require('playwright');
async function until(check, timeout=30000) {
 const end=Date.now()+timeout;
 while(Date.now()<end) {if(await check())return; await new Promise(r=>setTimeout(r,250));}
 throw new Error('Browser condition timed out');
}
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 const errors=[],warnings=[];
 page.on('pageerror',e=>{
  // Gradio's waveform reload aborts its previous fetch; confirmed independently on upload.
  if(e.name==='AbortError'&&e.stack?.includes('/assets/StaticAudio-')) warnings.push(e.message);
  else errors.push(e.message);
 });
 await page.goto('http://127.0.0.1:4198/');
 await page.getByRole('button',{name:'Make a song',exact:true}).click();
 await page.getByText('Could not make this reply.',{exact:false}).waitFor();
 await page.getByRole('checkbox').check();
 await page.getByRole('textbox',{name:'What does the recording say?'}).fill('I have a question');
 await page.getByRole('button',{name:'Upload file',exact:true}).click();
 await page.locator('#user-phrase input[type=file]').setInputFiles(process.cwd()+'/renders/voice-20261017-221411/source-pcm.wav');
 await until(async()=>page.locator('#user-phrase audio').evaluateAll(as=>as.some(a=>a.duration>2)));
 await page.getByRole('listbox',{name:'Style',exact:true}).click();
 await page.getByRole('option',{name:/Reggae/}).click();
 await page.getByRole('button',{name:'Make a song',exact:true}).click();
 console.log('Generating a real reply through the browser');
 await until(async()=>page.locator('#exchange-preview audio').evaluateAll(as=>as.some(a=>a.duration===30)),900000);
 await page.getByText('Compare with the original song',{exact:true}).click();
 await until(async()=>page.locator('#singer-preview audio').evaluateAll(as=>as.some(a=>a.duration===30)));
 const audios=page.locator('audio[src]');
 assert(await audios.evaluateAll(as=>as.every(a=>a.paused)));
 const singer=page.locator('#singer-preview audio[src]'), exchange=page.locator('#exchange-preview audio[src]');
 await until(async()=>exchange.evaluate(a=>a.duration===30));
 await page.waitForTimeout(300);
 await singer.evaluate(async a=>{a.muted=true;await a.play()});
 await exchange.evaluate(async a=>{a.muted=true;await a.play()});
 assert(await singer.evaluate(a=>a.paused));
 await exchange.evaluate(a=>{a.pause();a.currentTime=15});
 await until(async()=>exchange.evaluate(a=>!a.seeking&&a.currentTime===15));
 await page.screenshot({path:'docs/evidence/gentle-singer/studio-desktop.png'});
 const layouts=[];
 for(const width of [375,320]) {
  await page.setViewportSize({width,height:900});
  layouts.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.screenshot({path:'docs/evidence/gentle-singer/studio-mobile.png'});
 const result={status:errors.length||layouts.some(l=>l.overflow)?'FAIL':'PASS',browser:browser.version(),real_generation:'PASS',consent_required:'PASS',no_autoplay:'PASS',play_seek_exclusivity:'PASS',durations:await audios.evaluateAll(as=>as.map(a=>a.duration)),layouts,errors,warnings};
 await fs.writeFile('docs/evidence/gentle-singer/studio-browser.json',JSON.stringify(result,null,2)+'\n');
 assert.equal(errors.length,0);assert(layouts.every(l=>!l.overflow));console.log(result);
} finally {await browser.close()}
