import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-online-browser';
await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage(),errors=[],requests=[],expectedConsole=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url()===base+'/api/music-search')requests.push(request.postDataJSON().query);});
  page.on('console',message=>{
   if(!['warning','error'].includes(message.type()))return;
   const url=message.location().url,text=message.text();
   if((url==='https://cdn.visitorping.com/site/vp_QBDH92AC.js'&&/Failed to load resource/.test(text))||
    (text.includes(base+'/_next/static/chunks/')&&/\.css was preloaded.*not used/.test(text))||
    (url===base+'/api/music-search'&&/Failed to load resource.*(503|429)/.test(text)))expectedConsole.push({url,text});
   else errors.push(text);
  });
  assert.equal((await page.goto(base+'/music-dna')).status(),200);assert.match(await page.title(),/Music DNA/);
  const search=page.getByRole('combobox',{name:'Search artists or tracks'});
  await search.fill('b');await page.waitForTimeout(500);assert.equal(requests.length,0);
  await search.fill('be');await search.fill('bey');
  const artist=page.getByRole('option',{name:/Artist.*Beyoncé.*iTunes/s});await artist.waitFor({timeout:15000});
  assert.deepEqual(requests,['bey']);
  const liveNames=await page.getByRole('listbox').getByRole('option').allTextContents();assert.ok(liveNames.some(text=>text.includes('Halo')));
  assert.ok(liveNames.some(text=>text.includes('Track')));
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await search.evaluate(element=>element.scrollIntoView({block:'center'}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:join(output,`${name}-bey-${width}.png`)});
   assert.deepEqual((await new AxeBuilder({page}).include('.dna-search').analyze()).violations,[]);
  }
  await search.press('Enter');assert.equal(await page.getByRole('group',{name:'Beyoncé',exact:true}).count(),1);
  await search.fill('bey');const saved=page.getByRole('option',{name:/Saved favorite.*Beyoncé/s});await saved.waitFor();await page.waitForTimeout(500);assert.equal(requests.length,1);
  await saved.click();assert.equal(await page.getByRole('group',{name:'Beyoncé',exact:true}).count(),1);
  await search.fill('halo beyonce');const track=page.getByRole('option',{name:/Track.*Halo — Beyoncé/s}).first();await track.waitFor({timeout:15000});await track.click();
  assert.equal(await page.getByRole('group',{name:'Halo — Beyoncé',exact:true}).count(),1);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')??'{}').referenceMetadata?.some(m=>m.reference==='Halo — Beyoncé'&&m.genre));await page.reload();
  await page.getByRole('group',{name:'Halo — Beyoncé',exact:true}).waitFor();await page.getByRole('group',{name:'Beyoncé',exact:true}).waitFor();
  let releaseOld;const old=new Promise(resolve=>{releaseOld=resolve;});
  await context.route('**/api/music-search',async route=>{
   const query=route.request().postDataJSON().query;
   if(query==='older')await old;
   if(query==='offline'||query==='busy')return route.fulfill({status:query==='busy'?429:503,json:{error:'Fixture failure'}});
   const suggestions=query==='nothingzzzz'?[]:[{reference:query==='older'?'Old result':'New result',kind:'Artist',detail:'iTunes catalogue'}];
   await route.fulfill({json:{suggestions}}).catch(()=>{});
  });
  await search.fill('older');await page.waitForRequest(request=>request.url().endsWith('/api/music-search'));
  await search.fill('newer');await page.getByRole('option',{name:/New result/}).waitFor();releaseOld();await page.waitForTimeout(200);
  assert.equal(await page.getByRole('option',{name:/Old result/}).count(),0);
  await search.fill('offline');await page.getByRole('status').filter({hasText:'Online music search is unavailable'}).waitFor();
  await page.getByRole('option',{name:/Add by name.*offline/s}).click();assert.equal(await page.getByRole('group',{name:'offline',exact:true}).count(),1);
  await search.fill('busy');await page.getByRole('status').filter({hasText:'Music search is busy'}).waitFor();
  await search.fill('nothingzzzz');await page.getByRole('status').filter({hasText:'No online matches'}).waitFor();
  await search.fill('joth');await page.getByRole('option',{name:/Artist.*Joth/s}).click();assert.equal(await page.getByRole('group',{name:'Joth',exact:true}).count(),1);
  assert.equal(await page.locator('nextjs-portal').count(),0);assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',live_query:'bey',live_names:liveNames,live_artist_track_selection_persistence:'PASS',debounce_cache_duplicates:'PASS',stale_response_offline_busy_empty_fallback:'PASS',widths:[1280,390,320],axe_violations:0,console_errors:errors,expected_console:expectedConsole,audio_played:false});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
