// Synthetic UI fixtures only; never listener ratings. Requires the local Q0 server on 4198.
import assert from 'node:assert/strict';
import {chromium,webkit} from '../apps/site/node_modules/playwright/index.mjs';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const out=await mkdtemp(join(tmpdir(),'jamloom-q0-ui-'));
const base=process.env.Q0_REVIEW_URL||'http://127.0.0.1:4198/';
const candidates=Number(process.env.Q0_CANDIDATES||2);
assert.equal(new URL(base).hostname,'127.0.0.1');
assert.ok([2,4,5].includes(candidates));
const report=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch(); const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],external=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))consoleErrors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:'))external.push(r.url());});
 try {
  await page.goto(base);
  assert.equal(await page.title(),'Q0 blind expression diagnostic');
  await page.getByText('Packet ready. Ratings stay on this device.',{exact:true}).waitFor();
  assert.equal(await page.locator('audio').count(),5*(candidates+1)); assert.equal(await page.locator('select').count(),30*candidates);
  assert.ok((await page.locator('select').evaluateAll(ns=>ns.map(n=>n.value))).every(v=>v===''));
  assert.equal(await page.locator('form').evaluate(f=>f.checkValidity()),false);
  assert.equal(await page.getByRole('checkbox').isChecked(),false);
  await page.screenshot({path:join(out,name+'-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(out,name+'-mobile.png')});
  await page.locator('audio').evaluateAll(as=>as.forEach(a=>{a.muted=true;}));
  await page.locator('audio').nth(1).evaluate(a=>a.play());
  await page.waitForFunction(()=>document.querySelectorAll('audio')[1].readyState===4);
  if(name==='chromium') await page.waitForFunction(()=>document.querySelectorAll('audio')[1].currentTime>0);
  await page.locator('audio').nth(2).evaluate(a=>a.play());
  await page.waitForFunction(()=>document.querySelectorAll('audio')[2].readyState===4);
  if(name==='chromium') await page.waitForFunction(()=>document.querySelectorAll('audio')[2].currentTime>0);
  assert.equal(await page.locator('audio').nth(1).evaluate(a=>a.paused),true);
  await page.locator('audio').nth(2).evaluate(a=>a.pause());
  await page.getByLabel('Reviewer code').fill('UI_FIXTURE_ONLY');
  if(candidates===4) await page.locator('select').first().selectOption('3');
  else for(const s of await page.locator('select').all()) await s.selectOption('3');
  await page.getByRole('checkbox').check();
  const download=page.waitForEvent('download'); await page.getByRole('button').click();
  const file=join(out,name+'-synthetic-ui-ratings.json');await (await download).saveAs(file);
  const data=JSON.parse(await readFile(file,'utf8'));
  const packet=await(await page.request.get(base+'packet.json')).json();
  assert.equal(data.packet_id,packet.packet_id);assert.equal(data.ratings.reviewer,'UI_FIXTURE_ONLY');
  assert.equal(Object.keys(data.ratings).filter(k=>!k.endsWith('/notes')&&k!=='reviewer').length,30*candidates);
  if(candidates===4) assert.equal(Object.entries(data.ratings).filter(([k,v])=>k!=='reviewer'&&!k.endsWith('/notes')&&v!=='').length,1);
  await rm(file);
  assert.equal((await page.request.get(base+'organizer-key.json')).status(),404);
  await page.reload();assert.ok((await page.locator('select').evaluateAll(ns=>ns.map(n=>n.value))).every(v=>v===''));
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(external,[]);
  report.push({browser:name,version:browser.version(),status:name==='chromium'?'PASS':'PARTIAL',viewports:['1440x1000','390x844'],checks:[candidates===4?'partial ratings preserve missing values':'blank required ratings','muted audio decode and automatic pause','responsive width','packet-bound local download','organizer key not served','reload clears ratings','no page errors or external requests'],playback_clock:name==='chromium'?'PASS: muted playback advances':'PARTIAL: headless WebKit decodes but clock stalled in prior run',human_listening:'NOT RUN',physical_audio:'NOT RUN; unmuted headless clock stalled, muted automated playback used',ratings:'Synthetic UI fixtures deleted; never study evidence'});
 } finally {await browser.close();}
}
await writeFile(join(out,'report.json'),JSON.stringify({browser_plugin:'Invocation unavailable: Node JS tool not exposed; existing project Playwright used for authorized reproducible tests',results:report},null,2));
console.log(out);console.log('PASS: Chromium and WebKit form/decode flow; PARTIAL: WebKit playback clock; human listening NOT RUN');
