import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
import {songFixture} from './dna-song-fixture.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-playlist-browser';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});const evidence=[];
for(const [name,engine,width] of [['chromium',chromium,1280],['webkit',webkit,390]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(silenceSpeakers);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=await songFixture(context);let mode='off',checks=0,pages=0;
  await context.route('**/api/playlist-import',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{youtube:mode!=='off'}});
   pages++;const second=!!route.request().postDataJSON().pageToken;
   if(mode==='fail'&&second)return route.fulfill({status:503,json:{error:'Playlist temporarily unavailable.'}});
   if(mode==='wait')return route.fulfill({status:429,headers:{'Retry-After':'60'},json:{error:'Wait'}});
   return route.fulfill({json:{items:Array.from({length:second?3:50},(_,n)=>({title:`Test song ${n+(second?50:0)} — Test artist`,url:`https://www.youtube.com/watch?v=${String(n+(second?50:0)).padStart(11,'0')}`})),next:second?null:'next',skipped:second?1:0}});
  });
  await context.route('**/api/music-search',route=>{
   checks++;const query=route.request().postDataJSON().query,i=Number(query.match(/song (\d+)/)?.[1]);const reference=`Test song ${i} — Test artist`;
   return route.fulfill({json:{suggestions:i===52?[]:[{reference,kind:'Track',metadata:{reference,genre:i<20?'Pop':'Metal',source:'itunes',id:i+1}}]}});
  });
  await page.goto(base+'/music-dna');await page.getByText('Use a playlist',{exact:true}).click();
  await page.getByText('YouTube connection is not available here yet. Search for your favorites below.',{exact:true}).waitFor();
  const use=page.getByRole('button',{name:'Use this playlist',exact:true}),picker=page.locator('.dna-playlist-picker');assert(await use.isDisabled());
  mode='ok';await page.reload();await page.getByText('Use a playlist',{exact:true}).click();await page.getByLabel('YouTube playlist link').fill('https://www.youtube.com/playlist?list=PL1234567890');await use.click();
  await picker.getByText(/Checked 53 available playlist entries/).waitFor();assert.equal(pages,2);assert.equal(checks,53);
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')));assert.equal(saved.references.length,52);assert.equal(saved.referenceMetadata.filter(m=>m.genre==='Metal').length,32);assert.equal(await page.getByRole('button',{name:/Remove favorite /}).count(),12);
  await page.getByText('How we choose your sound',{exact:true}).click();await page.getByText(/Based on 52 of 52 favorites/).waitFor();
  await picker.getByText('1 song needs a match',{exact:true}).click();await picker.getByRole('button',{name:'Find song',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Search artists or tracks'}).inputValue(),'Test song 52 — Test artist');
  await use.click();await picker.getByText(/Checked 53 available playlist entries/).waitFor();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')));assert.equal(saved.references.length,52);
  assert.deepEqual((await new AxeBuilder({page}).include('.dna-playlist-picker').analyze()).violations,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await picker.scrollIntoViewIfNeeded();await page.screenshot({path:join(output,name+'.png')});
  mode='fail';await use.click();await picker.getByText('Playlist temporarily unavailable.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).references.length),52);
  mode='wait';await use.click();await picker.getByText(/Waiting for the song catalogue/).waitFor();assert(await page.getByRole('button',{name:'Make my music',exact:true}).isDisabled());await picker.getByRole('button',{name:'Cancel playlist check',exact:true}).click();await picker.getByText('Playlist check cancelled. Your favorites have not changed.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).references.length),52);
  await page.getByRole('button',{name:'Make my music',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Make your song',exact:true});await dialog.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();await dialog.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();await page.getByLabel('Play Fixture song 1',{exact:true}).waitFor();assert.equal(fixture.bodies.length,1);assert.equal(fixture.bodies[0].references.length,52);assert.equal(fixture.bodies[0].referenceMetadata.filter(m=>m.genre==='Metal').length,32);
  await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).references.length),52);assert.deepEqual(errors,[]);
  evidence.push({browser:name,width,status:'PASS',wholePlaylist:53,matched:52,lateMetalSongs:32,pages:2,automaticImport:true,duplicateImport:true,unmatchedReview:true,cancelAndFailurePreserveFavorites:true,fullGenerationPayload:true,reload:true,a11y:true,transport:'fixtures; no song generation'});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
