import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4220'?r.continue():r.abort());
 const page=await context.newPage();
 await page.addInitScript(()=>{
  window.observed={lcp_ms:null,cls:0};
  new PerformanceObserver(list=>{for(const e of list.getEntries())window.observed.lcp_ms=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.observed.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 });
 for(const path of ['/','/improvise','/dj-studio','/live-dj','/music-dna','/pricing','/examples','/learn','/help','/privacy','/terms','/licenses','/status']){
  await page.goto('http://127.0.0.1:4220'+path);await page.waitForLoadState('networkidle');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  results.push({path,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)})),lab:await page.evaluate(()=>({...window.observed,ttfb_ms:performance.getEntriesByType('navigation')[0].responseStart}))});
 }
 await page.goto('http://127.0.0.1:4220/');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');
 await writeFile(new URL('../../../docs/evidence/full-product/accessibility-performance.json',import.meta.url),JSON.stringify({browser:browser.version(),method:'Local unthrottled 390px Chromium, external analytics blocked; not field CWV or INP',manual_screen_reader:'NOT RUN',routes:results},null,2)+'\n');
 assert.equal(results.reduce((n,r)=>n+r.violations.length,0),0);console.log('PASS: 13 route WCAG automated scans and skip-link keyboard focus; local lab timings recorded');
}finally{await browser.close();}
