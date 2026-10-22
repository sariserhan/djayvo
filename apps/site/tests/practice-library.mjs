import {revealStudioTools} from '../../web/tests/studio-tools.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFile,readFile} from 'node:fs/promises';
const base='http://127.0.0.1:4224',evidence=new URL('../../../docs/evidence/practice-library-ten/',import.meta.url),results=[];
const {tracks}=JSON.parse(await readFile(new URL('../../web/practice-audio/manifest.json',import.meta.url)));
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio/dj.html');await revealStudioTools(page);await page.waitForFunction(()=>document.querySelector('#practice-track').options.length===10);
  assert.ok(await page.locator('#practice-load-a').isDisabled());
  await page.locator('#music-rights').check();
  const played=[];
  for(const [index,track] of tracks.entries()){
   const deck=index%2===1?'b':'a';
   await page.locator('#practice-track').selectOption(track.id);await page.locator('#practice-load-'+deck).click();
   await page.waitForFunction(({deck,title})=>document.querySelector('#state-'+deck).textContent==='Ready'&&document.querySelector('#name-'+deck).textContent.startsWith(title),{deck,title:track.title});
   await page.locator('#crossfade').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));},deck==='a'?'0':'1');
   await page.locator('#play-'+deck).click();
   await page.waitForFunction(deck=>document.querySelector('#audio-'+deck).currentTime>.4&&document.querySelector('#output-meter').value>.001,deck);
   assert.ok(await page.locator('#practice-load-'+deck).isDisabled());
   played.push({id:track.id,deck,duration:await page.locator('#audio-'+deck).evaluate(a=>a.duration),measuredPeak:await page.locator('#output-meter').evaluate(m=>m.value),gate:'PASS'});
   await page.locator('#play-'+deck).click();
  }
  const previous=await page.locator('#audio-a').getAttribute('src');
  const target='**/practice-audio/funked-up.mp3';await page.route(target,r=>r.fulfill({status:200,body:'damaged'}));
  await page.locator('#practice-track').selectOption('funked-up');await page.locator('#practice-load-a').click();
  await page.waitForFunction(()=>document.querySelector('#error-a').textContent.includes('Previous track kept'));
  assert.equal(await page.locator('#audio-a').getAttribute('src'),previous);await page.unroute(target);
  let began;const pending=new Promise(resolve=>began=resolve);let release;
  const hold=new Promise(resolve=>release=resolve);
  await page.route(target,async r=>{began();await hold;await r.abort().catch(()=>{});});
  await page.locator('#practice-load-a').click();await pending;await page.locator('#music-rights').uncheck();release();await page.unroute(target);
  assert.equal(await page.locator('#audio-a').getAttribute('src'),null);assert.ok(await page.locator('#practice-load-a').isDisabled());
  await page.locator('#practice-track').selectOption('funky-hip-hop-lofi-jam');
  assert.match(await page.locator('#practice-track option:checked').innerText(),/Lo-fi hip-hop/);
  const layouts=[];
  for(const width of [1920,390,320]){
   await page.setViewportSize({width,height:900});await page.locator('#practice-library').scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:new URL(name+'-'+width+'.png',evidence).pathname});layouts.push({width,gate:'PASS'});
  }
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.goto(base+'/academy/lessons/first-crossfade');await revealStudioTools(page);await page.locator('#academy-load').waitFor();
  await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});
  assert.match(await page.locator('#name-a').innerText(),/Extended/);assert.match(await page.locator('#name-b').innerText(),/Theories/);
  // Existing lesson fixtures remain separate; the same library is available for free practice.
  await page.locator('#practice-track').selectOption('funked-up');await page.locator('#practice-load-b').click();
  await page.waitForFunction(()=>document.querySelector('#name-b').textContent.startsWith('Funked Up'));
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.mp3':'audio/mpeg','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  const server=createServer(async(req,res)=>{
   const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
   if(name.includes('..')||name.includes('\\')){res.writeHead(400);res.end();return;}
   try{const data=await readFile(new URL('../../../dist/web/'+name,import.meta.url));res.setHeader('Content-Type',mime[extname(name)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);}
   catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let cached=[];
  try{
   const offlineContext=await browser.newContext(),offline=await offlineContext.newPage();
   const origin=`http://127.0.0.1:${server.address().port}`;
   offline.on('pageerror',e=>errors.push(e.message));
   await offline.goto(origin+'/index.html');await revealStudioTools(offline);await offline.locator('#privacy-open').click();await offline.locator('#offline-enable').click();
   await offline.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Studio saved'),null,{timeout:90000});
   await offline.goto(origin+'/dj.html');await revealStudioTools(offline);await offline.waitForFunction(()=>!!navigator.serviceWorker.controller);
   cached=await offline.evaluate(async()=>{
    const keys=await caches.keys(),cache=await caches.open(keys.find(k=>k.startsWith('djayvo-studio:')));
    return (await cache.keys()).map(r=>r.url).filter(u=>u.endsWith('.mp3'));
   });assert.equal(cached.length,10);
   // Stop the server: WebKit offline emulation can reject even cached navigation.
   await new Promise(resolve=>server.close(resolve));
   await offline.reload();await revealStudioTools(offline);await offline.waitForFunction(()=>document.querySelector('#practice-track').options.length===10);
   await offline.locator('#music-rights').check();
   for(const track of tracks){
    await offline.locator('#practice-track').selectOption(track.id);await offline.locator('#practice-load-a').click();
    await offline.waitForFunction(title=>document.querySelector('#state-a').textContent==='Ready'&&document.querySelector('#name-a').textContent.startsWith(title),track.title);
    await offline.locator('#play-a').click();await offline.waitForFunction(()=>document.querySelector('#audio-a').currentTime>.4&&document.querySelector('#output-meter').value>.001);
    await offline.locator('#play-a').click();
   }
   await offlineContext.close();
  }finally{server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));}
  assert.deepEqual(errors,[]);
  results.push({browser:name,version:browser.version(),played,consent:'PASS',replacementFailureKeepsTrack:'PASS',revocationDuringFetch:'PASS',layouts,axe:'PASS',lessonFixturesPreserved:'PASS',serverStoppedOfflineReloadAndPlayback:'PASS',cachedTracks:cached.length,errors});
 }finally{await browser.close();}
}
await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
