// Status fixtures exercise the real UI without paid generation. Local remix uses the real engine at the end.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {songFixture} from './dna-song-fixture.mjs';
import {silenceSpeakers} from './silent-audio.mjs';

const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247';
const output=process.env.JAMLOOM_EVIDENCE_DIR??'/tmp/jamloom-generation-progress';
assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(silenceSpeakers);
  await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Test favorite'],referenceMetadata:[{reference:'Test favorite',genre:'Pop',source:'itunes',id:1}],vocalLanguage:'en',energy:'balanced',tempo:100,instruments:['piano'],novelty:50})));
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const fixture=await songFixture(context);let state='queued',phase,disconnect=false;
  await context.route('**/api/taste/song*',r=>{
   const req=r.request(),url=new URL(req.url()),song=fixture.jobs.get(url.searchParams.get('id'));
   if(req.method()==='GET'&&song&&!url.searchParams.has('file')){
    if(disconnect)return r.fulfill({contentType:'application/json',body:'unreadable response'});
    return r.fulfill({json:{...song,state,phase,message:'Private GPU diagnostics must never appear'}});
   }
   return r.fallback();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/music-dna');assert.match(await page.title(),/Music DNA/);
  const start=async()=>{
   await page.getByRole('button',{name:/^Make (my music|another song)$/}).click();
   await page.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();
   await page.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();
  };
  const display=page.locator('.generation-progress:visible');
  const shown=async key=>{try{await page.locator(`.generation-progress[data-state="${key}"]:visible`).waitFor();}catch(error){console.error((await page.locator('#dna-notebook, #generation-progress, #error').allTextContents()).join('\n'));await page.screenshot({path:`${output}/${name}-failure.png`});throw error;}};
  await start();await shown('queued');assert.equal(fixture.bodies.length,1);
  assert.equal(await page.getByRole('button',{name:'Making your music…',exact:true}).isDisabled(),true);
  await page.reload();await shown('queued');assert.equal(fixture.bodies.length,1);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await display.scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${output}/${name}-queue-${width}.png`});
  }
  assert.deepEqual((await new AxeBuilder({page}).include('.generation-progress').analyze()).violations,[]);
  state='running';phase='writing';await shown('writing');
  phase='composing';await shown('composing');
  disconnect=true;await shown('reconnecting');disconnect=false;await shown('composing');
  for(const next of ['checking','retrying','checking','saving']){phase=next;await shown(next);}
  assert.doesNotMatch(await display.innerText(),/GPU|diagnostics|%/);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await display.locator('i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  state='completed';await shown('completed');await page.getByLabel('Play Fixture song 1',{exact:true}).waitFor();
  state='queued';await start();await shown('queued');await page.getByRole('button',{name:'Cancel composition',exact:true}).click();await shown('cancelled');
  await start();await shown('queued');state='rejected';await shown('rejected');
  assert.equal(await page.getByRole('button',{name:'Make another song',exact:true}).isEnabled(),true);

  await page.goto(base+'/studio/index.html');assert.match(await page.title(),/voice into music/);
  const wav=Buffer.alloc(44+48000*2*3);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  for(let i=0;i<48000*3;i++)wav.writeInt16LE(Math.round(5000*Math.sin(2*Math.PI*220*i/48000)),44+i*2);
  await page.locator('#consent').check();await page.locator('#file').setInputFiles({name:'permitted-synthetic-tone.wav',mimeType:'audio/wav',buffer:wav});
  await context.route('**/engine-worker.js',r=>r.fulfill({contentType:'text/javascript',body:"self.onmessage=()=>self.postMessage({type:'rendering'});"}));
  await page.locator('#generate').click();await shown('composing');
  await display.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-improvise-320.png`});
  assert.deepEqual((await new AxeBuilder({page}).include('.generation-progress').analyze()).violations,[]);
  await page.locator('#cancel').click();await shown('cancelled');
  await context.unroute('**/engine-worker.js');
  await page.locator('#generate').click();await page.locator('.generation-progress[data-state="completed"]').waitFor({timeout:120000});
  assert.ok(await page.locator('#library audio').count()>0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:name,status:'PASS',queueRestore:true,reconnect:true,phases:true,cancel:true,rejected:true,ready:true,mobile:true,accessibility:true,reducedMotion:true,realLocalRemix:true,cloudGeneration:'NOT RUN'}));
 }finally{await browser.close();}
}
