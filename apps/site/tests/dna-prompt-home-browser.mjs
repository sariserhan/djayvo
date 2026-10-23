// Real rendered pages; quoted-generation transport is a fixture. Existing sample audio is real.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {songFixture} from './dna-song-fixture.mjs';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-prompt-home';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>{const url=new URL(r.request().url());return url.origin===base||url.hostname.endsWith('.r2.cloudflarestorage.com')?r.continue():r.abort();});
  await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Test favorite'],referenceMetadata:[{reference:'Test favorite',genre:'Pop',source:'itunes'}],vocalLanguage:'en',energy:'balanced',tempo:100,instruments:['piano'],novelty:50})));
  const fixture=await songFixture(context);let quotes=0;
  await context.route('**/api/taste/song*',r=>{if(r.request().method()==='POST'&&r.request().postDataJSON().action==='quote'){quotes++;return r.fulfill({json:{credits:3,token:'higher-price-fixture',expiresAt:Date.now()+300000}});}return r.fallback();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/music-dna');
  assert.match(await page.title(),/Music DNA/);const start=page.getByRole('button',{name:'Make my music',exact:true}),dialog=page.getByRole('dialog',{name:'Make your song',exact:true});
  assert.equal(await page.getByRole('radio').count(),0);assert.equal(await page.getByText('Starting price:',{exact:false}).isVisible(),false);
  await start.click();await dialog.waitFor();assert.equal(quotes,0);assert.equal(fixture.bodies.length,0);
  assert.equal(await dialog.getByRole('button',{name:/^Generate song/}).isDisabled(),true);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`${name}-prompt-${width}.png`)});}
  assert.deepEqual((await new AxeBuilder({page}).include('dialog').analyze()).violations,[]);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await start.evaluate(e=>e===document.activeElement),true);assert.equal(quotes,0);
  await start.click();await dialog.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();
  assert.equal(await dialog.getByRole('checkbox').count(),0);await dialog.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();
  await dialog.getByText(/This song needs 3 credits/).waitFor();assert.equal(fixture.bodies.length,0);
  await dialog.getByRole('button',{name:'Generate song · 3 credits',exact:true}).click();
  await dialog.waitFor({state:'hidden'});await page.getByLabel('Play Fixture song 1',{exact:true}).waitFor();assert.equal(fixture.bodies.length,1);assert.equal(quotes,1);
  await context.unroute('**/api/taste/song*');
  const track={id:'11111111-1111-4111-8111-111111111111',title:'Public studio mix',artist:'Shared artist',strategy:'funk',duration_ms:120000,mood:'playful',description:'Public catalogue fixture'};
  await context.route('**/api/catalogue?sort=latest',r=>r.fulfill({json:{tracks:[track]}}));
  const sample=await context.request.get(base+'/api/taste/song?id=06d89abd7d194ddf81bbc54af3e9b67f&file=audio');assert.equal(sample.status(),200);const bytes=await sample.body();
  await context.route('**/api/catalogue/*/audio',r=>r.fulfill({contentType:'audio/wav',body:bytes}));
  await page.goto(base+'/');assert.match(await page.title(),/Learn, Mix/);assert.equal(await page.locator('h1').count(),1);
  const gallery=page.getByRole('region',{name:'Made with Music DNA',exact:true});assert.equal(await gallery.locator('audio').count(),4);
  const initial=await gallery.locator('audio').evaluateAll(list=>list.map(a=>a.src));await gallery.getByRole('button',{name:'Next songs',exact:true}).click();assert.equal(await gallery.locator('audio').count(),4);assert.ok((await gallery.locator('audio').evaluateAll(list=>list.map(a=>a.src))).every(src=>!initial.includes(src)));
  await gallery.getByRole('button',{name:'Back to previous songs',exact:true}).click();assert.deepEqual(await gallery.locator('audio').evaluateAll(list=>list.map(a=>a.src)),initial);
  assert.equal(await page.locator('#public-songs').count(),0);assert.equal(await page.locator('#music-dna img').count(),0);
  assert.equal(await gallery.locator('audio').evaluateAll(list=>list.every(a=>a.paused)),true);
  const audio=gallery.locator('audio').first();await audio.evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.dna-preview-grid audio').currentTime>.1);assert.equal(await audio.evaluate(a=>a.muted),true);
  await page.getByRole('button',{name:'Play Public studio mix',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.music-player audio').currentTime>.1);assert.equal(await audio.evaluate(a=>a.paused),true);
  await audio.evaluate(a=>a.play());assert.equal(await page.getByLabel('Catalogue player',{exact:true}).evaluate(a=>a.paused),true);
  await page.getByRole('button',{name:'Play Deck A',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.mini-deck audio').currentTime>.1);assert.equal(await audio.evaluate(a=>a.paused),true);
  await audio.evaluate(a=>a.play());assert.equal(await page.locator('.mini-deck audio').first().evaluate(a=>a.paused),true);await audio.evaluate(a=>a.pause());
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await gallery.scrollIntoViewIfNeeded();await page.screenshot({path:join(output,`${name}-home-${width}.png`)});}
  assert.deepEqual((await new AxeBuilder({page}).include('.product-home').analyze()).violations,[]);assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',prompt_after_click:true,escape_restores_focus:true,no_charge_on_open:true,higher_quote_requires_second_confirmation:true,one_generation:true,homepage_preview_songs:4,catalogue_and_dna_playback:true,exclusive_players:true,widths:[1280,390,320],axe_violations:0,errors,model_execution:'fixture only',human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
