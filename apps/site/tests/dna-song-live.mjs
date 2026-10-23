import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-song-live';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});
const ids=(process.env.JAMLOOM_DNA_SONG_IDS??'').split(',').filter(Boolean),results=[];
if(process.env.JAMLOOM_DNA_RENDER==='1'){
 const browser=await chromium.launch({args:['--mute-audio']});
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const refs=['Black Hole Sun — Soundgarden','Back In Black — AC/DC','Master of Puppets — Metallica'];
  await context.addInitScript(refs=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:refs,energy:'balanced',tempo:100,instruments:['piano'],novelty:50,referenceMetadata:refs.map((reference,i)=>({reference,genre:['Alternative','Hard Rock','Metal'][i],source:'itunes',id:100+i}))})),refs);
  const page=await context.newPage();await page.goto(base+'/music-dna');const submitted=page.waitForResponse(r=>r.url().endsWith('/api/taste/song')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Make my music',exact:true}).click();
  const response=await submitted;assert.equal(response.status(),202);const {id}=await response.json();ids.push(id);
  await writeFile(join(output,'submitted.json'),JSON.stringify({id,references:refs,via:'actual website submission'},null,2));
  console.log('Actual song submitted',id);
  for(let i=0;i<65;i++){
   const status=await(await context.request.get(`${base}/api/taste/song?id=${id}`)).json();console.log(status.state,status.message);
   if(status.state==='completed')break;
   assert.equal(status.state,'running');if(i===64)throw Error('Song did not finish within its bound');
   await page.waitForTimeout(30000);
  }
  await page.locator('audio[src*="file=audio"]').first().waitFor({timeout:10000});
  await page.reload();await page.locator('audio[src*="file=audio"]').first().waitFor();
 }finally{await browser.close();}
}
assert.ok(ids.length);assert.ok(ids.every(id=>/^[a-f0-9]{32}$/.test(id)));
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const saved={version:1,references:['A favorite already saved'],energy:'balanced',tempo:100,instruments:['piano'],novelty:50};
  await context.addInitScript(saved=>localStorage.setItem('jamloom-taste-v1',JSON.stringify(saved)),saved);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/music-dna?'+ids.map(id=>'song='+id).join('&'));
  await page.locator('audio[src*="file=audio"]').nth(ids.length-1).waitFor();const songs=[];
  for(let i=0;i<ids.length;i++){
   const audio=page.locator('audio[src*="file=audio"]').nth(i);
   assert.equal(await audio.evaluate(a=>a.paused),true);await audio.evaluate(a=>a.play());
   await page.waitForFunction(i=>document.querySelectorAll('audio[src*="file=audio"]')[i].currentTime>.2,i);
   assert.equal(await audio.evaluate(a=>a.muted),true);const duration=await audio.evaluate(a=>a.duration);assert.equal(duration,120);
   if(i)assert.equal(await page.locator('audio[src*="file=audio"]').first().evaluate(a=>a.paused),true);
   await audio.evaluate(a=>{a.currentTime=90;});await page.waitForFunction(i=>document.querySelectorAll('audio[src*="file=audio"]')[i].currentTime>=90,i);
   const response=await context.request.get(`${base}/api/taste/song?id=${ids[i]}&file=audio`,{headers:{Range:'bytes=0-43'}});assert.equal(response.status(),206);assert.equal((await response.body()).subarray(0,4).toString(),'RIFF');
   const song=await(await context.request.get(`${base}/api/taste/song?id=${ids[i]}`)).json();assert.equal(song.state,'completed');assert.equal(song.plan.influences.length,song.profile.references.length);songs.push({id:ids[i],title:song.plan.title,seconds:duration,language:song.plan.cases[0].vocal_language??'en',voice:song.plan.cases[0].voice,bpm:song.plan.cases[0].bpm,caption:song.plan.cases[0].song_caption});
  }
  await page.locator('audio').evaluateAll(list=>list.forEach(a=>a.pause()));
  const downloading=page.waitForEvent('download');await page.getByRole('link',{name:'Download song',exact:true}).first().click();
  const download=await downloading,bytes=await readFile(await download.path());assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.length,23040044);
  const downloaded={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),filename:download.suggestedFilename()};
  await page.getByText('Lyrics',{exact:true}).first().click();await page.getByText('How these favorites shaped this song',{exact:true}).first().click();
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('heading',{name:'Example songs',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(output,`${name}-${width}.png`),fullPage:true});}
  assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom-dna-songs-v1')),null);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).references),saved.references);
  assert.equal(await page.getByRole('region',{name:'Songs for this list',exact:true}).count(),0);
  assert.deepEqual((await new AxeBuilder({page}).include('.product-panel').analyze()).violations,[]);assert.deepEqual(errors,[]);
  results.push({browser:name,status:'PASS',songs,downloaded,no_autoplay:true,muted_playback:true,seek_seconds:90,range_status:206,layouts:[1280,390,320],axe_violations:0,errors,human_listening:'NOT RUN'});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
