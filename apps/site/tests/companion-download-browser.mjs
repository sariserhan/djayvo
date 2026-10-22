import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.JAMLOOM_DOWNLOAD_TEST_URL??'http://127.0.0.1:4236';
const folder=process.env.JAMLOOM_DOWNLOAD_EVIDENCE??'/tmp/jamloom-download-browser';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio']});
try {
 const context=await browser.newContext();const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto(base);await page.getByRole('link',{name:'Download Live DJ for Mac'}).click();
 await page.waitForURL(base+'/live-dj');
 assert.equal(await page.getByRole('link',{name:'Download Jamloom Live for Mac',exact:true}).getAttribute('href'),'https://github.com/sariserhan/jamloom/releases/download/live-v0.4.0/Jamloom-Live-0.4.0-macOS.zip');
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
  await page.screenshot({path:folder+'/download-'+width+'.png',fullPage:true});
 }
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
 await page.goto(base+'/improvise');await page.waitForURL(base+'/');
 assert.equal((await page.request.get(base+'/api/generations')).status(),503);
 assert.deepEqual(errors,[]);
 const result={status:'PASS',base,anonymousDownload:'PASS',otherProductGates:'PASS',widths:[1440,390,320],axe:'PASS',noAudioStarted:true};
 await writeFile(folder+'/results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
