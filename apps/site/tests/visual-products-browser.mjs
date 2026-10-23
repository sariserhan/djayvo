import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
import {homeProducts} from '../lib/home-products.ts';
import {comingSoonResponse} from '../lib/coming-soon.ts';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-visual-products';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');
  assert.match(await page.title(),/Learn, Mix/);assert.equal(await page.locator('h1').count(),1);
  const choices=page.locator('.showcase-choices'),preview=page.locator('#showcase-preview');assert.equal(await choices.getByRole('button').count(),5);
  const audio=preview.locator('audio');assert.equal(await audio.evaluate(a=>a.paused),true);await preview.getByRole('button',{name:'▶ Hear this song',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.showcase-preview audio').currentTime>.1);assert.equal(await audio.evaluate(a=>a.muted),true);
  for(const p of homeProducts){await choices.getByRole('button',{name:p.intent+' '+p.name,exact:true}).click();assert.equal(await choices.locator('[aria-pressed=true]').count(),1);assert.equal(await preview.getAttribute('aria-label'),p.name+' preview');assert.equal(await preview.locator('a.primary').getAttribute('href'),p.slug==='dj-studio'?'#dj-studio':'/'+p.slug);if(p.slug!=='music-dna')await preview.locator('img').evaluate(img=>img.decode());}
  await choices.getByRole('button',{name:'Make a song Music DNA',exact:true}).click();assert.equal(await preview.locator('audio').evaluate(a=>a.paused),true);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await choices.getByRole('button').last().evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'All five choices should fit the initial viewport');await page.screenshot({path:join(output,`${name}-home-${width}.png`)});}
  assert.deepEqual((await new AxeBuilder({page}).include('.product-showcase').analyze()).violations,[]);
  assert.equal(await page.locator('.product-chapters > article').count(),5);assert.equal(await page.locator('.product-chapters details[open]').count(),0);
  const screens=[];
  for(const slug of ['music-dna','improvise','dj-studio','academy','live-dj']){
   await page.goto(base+'/'+slug);await page.locator('h1').waitFor();assert.equal(await page.locator('h1').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),slug+' overflow');
   if(slug==='music-dna'){const search=page.getByRole('combobox',{name:'Search artists or tracks'});await search.waitFor();assert.ok((await search.boundingBox()).y<(await page.getByRole('combobox',{name:'Singing language',exact:true}).boundingBox()).y);}
   if(['improvise','dj-studio','music-dna'].includes(slug)){assert.equal(await page.locator('.product-intro details[open]').count(),0);await page.locator('.product-intro summary').click();await page.locator('.product-intro details[open]').waitFor();await page.locator('.product-intro summary').click();}
   await page.screenshot({path:join(output,`${name}-${slug}-320.png`)});screens.push(slug);
  }
  const response=comingSoonResponse(new Request(base+'/')),body=await response.text();
  await context.route(base+'/',r=>r.fulfill({status:200,headers:Object.fromEntries(response.headers),body}));await page.goto(base+'/');
  assert.equal(await page.locator('.launch-products-nav a').count(),5);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`${name}-coming-soon-${width}.png`)});}
  await page.locator('.launch-products-nav a[href="#music-dna"]').click();assert.ok(page.url().endsWith('#music-dna'));
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations,[]);assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',five_choices_above_fold:true,real_example_muted_playback:true,preview_switches_and_routes:true,all_features_preserved_under_details:true,product_routes:screens,public_coming_soon:'rendered actual response fixture; no deployment',widths:[1280,390,320],axe_violations:0,errors});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
