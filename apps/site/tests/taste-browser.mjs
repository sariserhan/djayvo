import {songFixture} from './dna-song-fixture.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-browser';
await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(silenceSpeakers);
  // The same seed isolates preference changes in the two UI-generated WAVs.
  await context.addInitScript(()=>Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(4123);return a;}}));
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  // Catalogue-network behavior has its own live and failure-state browser test.
  await context.route('**/api/music-search',route=>{const q=route.request().postDataJSON().query;const reference=q==='quiet'?'Quiet study':q==='night'?'Night set':null;return route.fulfill({json:{suggestions:reference?[{reference,kind:'Track',detail:'Test catalogue',metadata:{reference,genre:q==='quiet'?'Classical':'Dance',source:'itunes',id:q==='quiet'?1:2}}]:[]}});});
  const fixture=await songFixture(context);
  const page=await context.newPage(),errors=[],expectedConsole=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
   if(!['warning','error'].includes(m.type()))return;
   const url=m.location().url,text=m.text();
   if((url==='https://cdn.visitorping.com/site/vp_QBDH92AC.js'&&/Failed to load resource/.test(text))||
     (m.type()==='warning'&&text.includes(base+'/_next/static/chunks/')&&/\.css was preloaded.*not used/.test(text)))expectedConsole.push({url,text});
   else errors.push(text);
  });
  assert.equal((await page.goto(base+'/music-dna')).status(),200);assert.match(await page.title(),/Music DNA/);
  await page.getByRole('heading',{name:'Your favorite music'}).waitFor();
  const search=page.getByRole('combobox',{name:'Search artists or tracks'});
  await search.fill('j');assert.ok(await page.getByRole('option').count()>1);
  await search.fill('joth');assert.match(await page.getByRole('option').first().innerText(),/Artist.*Joth/s);
  await search.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
  await search.press('ArrowDown');assert.equal(await search.getAttribute('aria-expanded'),'true');await search.press('Enter');
  assert.equal(await page.getByRole('group',{name:'Joth',exact:true}).count(),1);
  await search.fill('joth');await search.press('Enter');assert.equal(await page.getByRole('group',{name:'Joth',exact:true}).count(),1);
  await page.getByRole('button',{name:'Remove favorite Joth',exact:true}).click();
  await search.fill('funkd');await page.getByRole('option',{name:/Track.*Funked Up/s}).click();
  assert.equal(await page.getByRole('group',{name:'Funked Up — Joth',exact:true}).count(),1);
  await page.getByRole('button',{name:'Remove favorite Funked Up — Joth',exact:true}).click();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await search.fill('jo');await search.scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:join(output,`${name}-search-${width}.png`)});
   assert.deepEqual((await new AxeBuilder({page}).include('.dna-search').analyze()).violations,[]);
  }
  await search.press('Escape');await page.setViewportSize({width:1280,height:900});
  assert.equal(await page.locator('.product-panel audio').count(),10);assert.ok(await page.locator('.product-panel audio').evaluateAll(list=>list.every(a=>a.paused&&a.preload==='none')));
  await page.getByText('Discover practice tracks',{exact:true}).click();
  const preview=page.getByLabel('Listen to Funked Up',{exact:true});
  await preview.evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.product-panel audio')?.currentTime>0);
  assert.ok(await preview.evaluate(a=>a.duration>10&&a.muted));
  const second=page.locator('.product-panel audio').nth(1);await second.evaluate(a=>a.play());
  await page.waitForFunction(()=>document.querySelector('.product-panel audio')?.paused);await second.evaluate(a=>a.pause());
  await page.getByText('Discover practice tracks',{exact:true}).click();
  assert.equal(await page.getByText('What would you like in your music?',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('Preferred tempo:').count(),0);
  const plans=[];
  const wavs=[],audio=[];
  for(let i=0;i<2;i++){
   console.log(name,'render',i);
   if(i)await page.getByRole('button',{name:'Remove favorite Quiet study',exact:true}).click();
   await search.fill(i?'night':'quiet');await page.getByRole('option',{name:i?/Track.*Night set/:/Track.*Quiet study/}).click();
   assert.match(await page.locator('.dna-summary').innerText(),i?/Dance/:/Classical/);
   await page.getByRole('button',{name:i?'Make another variation':'Make my music',exact:true}).click();
   await page.getByLabel(`Composition variation ${i+1}`,{exact:true}).waitFor({timeout:120000});
   const plan=await page.getByRole('link',{name:'Download song notes',exact:true}).nth(i).evaluate(async a=>await(await fetch(a.href)).json());
   assert.equal(plan.cases[0].voice,'female');assert.ok(plan.cases[0].lyrics.includes('[Chorus]'));plans.push(plan);
   assert.equal(fixture.bodies[i].referenceMetadata[0].genre,i?'Dance':'Classical');
   const url=await page.getByLabel(`Composition variation ${i+1}`,{exact:true}).getAttribute('src');
   const result=await page.evaluate(async url=>{
    const bytes=await(await fetch(url)).arrayBuffer();const context=new OfflineAudioContext(2,1,48000);
    const buffer=await context.decodeAudioData(bytes.slice(0));let peak=0,sum=0;
    for(let c=0;c<buffer.numberOfChannels;c++)for(const sample of buffer.getChannelData(c)){if(!Number.isFinite(sample))throw Error('Nonfinite PCM');peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
    return {bytes:Array.from(new Uint8Array(bytes)),seconds:buffer.duration,peak,rms:Math.sqrt(sum/(buffer.length*buffer.numberOfChannels))};
   },url);
   const bytes=new Uint8Array(result.bytes);wavs.push(bytes);delete result.bytes;audio.push(result);
   assert.ok(result.seconds>=28&&result.seconds<=33);assert.ok(result.peak>0&&result.peak<=1);assert.ok(result.rms>0);
   await writeFile(join(output,`${name}-${i?'dance-favorites':'classical-favorites'}.wav`),bytes);
  }
  assert.notDeepEqual(fixture.bodies[0].references,fixture.bodies[1].references);
  await page.reload();
  await page.getByRole('group',{name:'Night set',exact:true}).waitFor();assert.match(await page.locator('.dna-summary').innerText(),/Dance/);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow at '+width);
   await page.getByRole('heading',{name:'Your favorite music'}).evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:join(output,`${name}-${width}.png`)});
  }
  const accessibility=await new AxeBuilder({page}).include('.product-panel').analyze();assert.deepEqual(accessibility.violations,[]);
  await page.getByRole('button',{name:'Remove favorite Night set',exact:true}).click();await search.fill('Another song');await page.getByRole('option',{name:/Add by name/}).click();
  await page.reload();await page.getByRole('group',{name:'Another song',exact:true}).waitFor();
  await page.getByText('Saved favorites',{exact:true}).click();
  await page.getByRole('button',{name:'Delete saved profile',exact:true}).click();assert.equal(await page.locator('.dna-favorites fieldset').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom-taste-v1')),null);assert.ok(await page.getByRole('button',{name:'Make another variation',exact:true}).isDisabled());assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',widths:[1280,390,320],search_typing_typo_keyboard_pointer_duplicates:'PASS',muted_catalogue_playback:'PASS',exclusive_audio:'PASS',automatic_favorites_only_composition:'PASS',plans,generation_transport:'fixture, not model execution',audio,autosave_metadata_removal:'PASS',axe_violations:0,console_errors:errors,expected_console:expectedConsole,human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
