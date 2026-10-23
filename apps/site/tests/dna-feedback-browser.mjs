import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {songFixture} from './dna-song-fixture.mjs';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-feedback-browser';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);
  await context.addInitScript(()=>{if(!localStorage.getItem('jamloom-taste-v1'))localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Coverage fixture'],referenceMetadata:[{reference:'Coverage fixture',genre:'Pop',source:'itunes',id:1}],energy:'balanced',tempo:100,instruments:['piano'],novelty:50}));});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const fixture=await songFixture(context),records=new Map();let failLoad=false;const writes=[];
  await context.route('**/api/taste/feedback*',async route=>{
   const req=route.request(),id=new URL(req.url()).searchParams.get('id'),key=req.headers()['x-jamloom-listener'];assert.match(key,/^[a-f0-9]{32}$/);
   const owner=key+id;
   if(req.method()==='GET')return route.fulfill({status:failLoad?503:200,json:failLoad?{error:'fixture outage'}:{feedback:records.get(owner)??null}});
   assert.equal(req.headers()['x-jamloom-dna'],'1');
   if(req.method()==='DELETE'){if(id)records.delete(owner);else for(const k of records.keys())if(k.startsWith(key))records.delete(k);return route.fulfill({json:{deleted:true}});}
   const value=req.postDataJSON();writes.push(value);records.set(owner,value);return route.fulfill({json:{feedback:value}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/music-dna');
  const language=page.getByRole('combobox',{name:'Singing language'});await language.waitFor();assert.equal(await language.locator('option').count(),51);
  for(const code of ['es','ru','tr']){await language.selectOption(code);await page.waitForFunction(code=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).vocalLanguage===code,code);await page.reload();await language.waitFor();assert.equal(await language.inputValue(),code);}
  await page.getByRole('button',{name:'Make my music',exact:true}).click();await page.getByLabel('Play Fixture song 1',{exact:true}).waitFor();assert.equal(fixture.bodies[0].vocalLanguage,'tr');
  const group=page.getByRole('group',{name:'Song feedback',exact:true});await group.getByRole('button',{name:'Not for me',exact:true}).click();
  const personal=group.getByRole('checkbox',{name:'Use this feedback to shape my future songs'}),training=group.getByRole('checkbox',{name:'Allow this Jamloom song and my rating to help train the model'});
  assert.equal(await personal.isChecked(),false);assert.equal(await training.isChecked(),false);
  await group.getByRole('button',{name:'Too slow',exact:true}).click();await personal.check();await group.getByRole('button',{name:'Save feedback',exact:true}).click();
  await group.getByRole('status').filter({hasText:'next songs'}).waitFor();assert.deepEqual(writes.at(-1),{rating:'dislike',tags:['too_slow'],personalize:true,trainingConsent:false});
  await page.reload();await group.getByRole('button',{name:'Delete feedback'}).waitFor();assert.equal(await personal.isChecked(),true);assert.equal(await training.isChecked(),false);
  await training.check();await group.getByRole('button',{name:'Save feedback',exact:true}).click();await group.getByRole('status').filter({hasText:'enough reviewed examples'}).waitFor();assert.equal(writes.at(-1).trainingConsent,true);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});await group.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`${name}-${width}.png`)});}
  assert.deepEqual((await new AxeBuilder({page}).include('.product-panel').analyze()).violations,[]);
  failLoad=true;await page.reload();await page.getByRole('button',{name:'Reload feedback'}).waitFor();assert.equal(await group.getByRole('button',{name:'Not for me',exact:true}).isDisabled(),true);
  failLoad=false;await page.getByRole('button',{name:'Reload feedback'}).click();await group.getByRole('button',{name:'Delete feedback'}).waitFor();await group.getByRole('button',{name:'Delete feedback'}).click();await group.getByRole('status').filter({hasText:'Feedback deleted'}).waitFor();assert.equal(records.size,0);
  await page.reload();await group.getByRole('button',{name:'Yes, I like it'}).waitFor();assert.equal(await group.getByRole('button',{name:'Yes, I like it'}).getAttribute('aria-pressed'),'false');
  await group.getByRole('button',{name:'Yes, I like it'}).click();await training.check();await group.getByRole('button',{name:'Save feedback',exact:true}).click();await group.getByRole('status').filter({hasText:'enough reviewed examples'}).waitFor();
  await page.getByText('Feedback settings',{exact:true}).click();await page.getByRole('button',{name:'Delete all my feedback',exact:true}).click();await page.getByRole('status').filter({hasText:'All feedback from this browser'}).waitFor();assert.equal(records.size,0);
  await page.waitForFunction(()=>document.querySelector('fieldset[aria-label="Song feedback"] button[aria-pressed="true"]')===null);assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',language_save_reload:['es','ru','tr'],generation_language:'tr',explicit_separate_consents:true,feedback_save_reload_delete:true,bulk_withdrawal_clears_cards:true,failed_load_recovery:true,widths:[1280,390,320],axe_violations:0,transport:'isolated browser fixtures, no training records',human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
