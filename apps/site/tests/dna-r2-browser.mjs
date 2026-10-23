// Real R2 playback through the production build, with no Mac singer or account DB.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4248',output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-dna-r2-browser';
const manifest=JSON.parse(await readFile(new URL('../../../assets/manifests/music-validation.json',import.meta.url),'utf8'));
await mkdir(output,{recursive:true});const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
  await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===base||u.hostname.endsWith('.r2.cloudflarestorage.com')?r.continue():r.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/music-dna');
  const gallery=page.getByRole('region',{name:'Made with Music DNA',exact:true});await gallery.locator('audio').nth(17).waitFor();
  assert.equal(await page.getByRole('region',{name:'Made with Music DNA',exact:true}).count(),1);
  assert.equal(await gallery.locator('audio').count(),18);assert.equal(await gallery.getByText('Rate this song',{exact:true}).count(),0);
  const audio=gallery.locator('audio').first();assert.equal(await audio.evaluate(a=>a.paused),true);await audio.evaluate(a=>a.play());
  await page.waitForFunction(()=>document.querySelector('.dna-song-grid audio').currentTime>.1);assert.equal(await audio.evaluate(a=>a.muted),true);
  const duration=await audio.evaluate(a=>a.duration),seek=duration*.75;assert.ok(duration>0);await audio.evaluate((a,time)=>{a.currentTime=time;},seek);await page.waitForFunction(time=>document.querySelector('.dna-song-grid audio').currentTime>=time,seek);await audio.evaluate(a=>a.pause());
  const id=new URL(await audio.getAttribute('src'),base).searchParams.get('id'),expected=manifest.songs.find(song=>song.id===id);assert.ok(expected);
  const response=await context.request.get(base+await audio.getAttribute('src'),{maxRedirects:0});assert.equal(response.status(),307);
  const signed=response.headers().location,range=await context.request.get(signed,{headers:{Range:'bytes=0-43'}});assert.equal(range.status(),206);assert.equal((await range.body()).byteLength,44);
  const unsigned=new URL(signed);unsigned.search='';assert.ok([400,403].includes((await context.request.get(unsigned.href)).status()));
  const pending=page.waitForEvent('download');await gallery.getByRole('link',{name:'Download song',exact:true}).first().click();
  const download=await pending,bytes=await readFile(await download.path());assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.audioSha256);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});await gallery.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`${name}-${width}.png`)});}
  assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',songs:manifest.songs.length,localSinger:false,accountDatabase:false,storage:'real private R2',mutedPlayback:true,seconds:duration,seek,rangeStatus:206,unsignedDenied:true,downloadChecksum:'PASS',widths:[1280,390,320],errors});
 }finally{await browser.close();}
}
await writeFile(join(output,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
