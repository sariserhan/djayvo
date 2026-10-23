import {songFixture} from './dna-song-fixture.mjs';
import {revealStudioTools} from '../../web/tests/studio-tools.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import {silenceSpeakers} from './silent-audio.mjs';
const base='http://127.0.0.1:4226',folder=await mkdtemp(join(tmpdir(),'jamloom-completion-')),results=[];
const site=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4226'],{env:{...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:'',BETTER_AUTH_URL:base},stdio:['ignore','pipe','pipe']});let log='';site.stdout.on('data',b=>log+=b);site.stderr.on('data',b=>log+=b);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/music-dna')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Site unavailable');}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});await context.addInitScript(silenceSpeakers);
   await context.route('**/*',route=>(new URL(route.request().url()).origin===base||route.request().url().startsWith('blob:'))?route.continue():route.abort());
   await context.route('**/api/music-search',route=>route.fulfill({json:{suggestions:[]}}));
   await songFixture(context);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/music-dna');await revealStudioTools(page);assert.match(await page.title(),/Music DNA/);
   await page.getByRole('combobox',{name:'Search artists or tracks'}).fill('Private reference — never uploaded');await page.getByRole('option',{name:/Add by name/}).click();
   await page.getByText('Discover practice tracks',{exact:true}).click();await page.getByLabel('Search cleared tracks').fill('Funked');await page.getByRole('button',{name:'Add Funked Up to favorites',exact:true}).click();
   assert.match(await page.locator('.dna-summary').innerText(),/Funk/);
   await page.getByRole('button',{name:'Make my music',exact:true}).click();
   await page.getByRole('heading',{name:'Songs for this list',exact:true}).waitFor({timeout:120000});
   const audio=page.locator('audio[src*="file=audio"]');await audio.evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('audio[src*="file=audio"]').currentTime>.1);
   assert.equal(await audio.evaluate(a=>a.muted),true);const duration=await audio.evaluate(a=>a.duration);assert.ok(duration>=26&&duration<=31);
   await audio.evaluate(a=>a.pause());
   const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download song',exact:true}).click();const download=await downloadPromise;
   const wavPath=join(folder,name+'-dna.wav');await download.saveAs(wavPath);const wav=await readFile(wavPath);assert.equal(wav.toString('ascii',0,4),'RIFF');
   const score=await page.getByRole('link',{name:'Download song notes',exact:true}).evaluate(async a=>JSON.parse(await (await fetch(a.href)).text()));
   assert.equal(score.cases[0].voice,'female');assert.equal(score.influences.length,2);
   await page.getByRole('button',{name:'Make another song',exact:true}).click();await page.getByRole('button',{name:'Cancel composition',exact:true}).click();
   assert.match(await page.getByRole('status').innerText(),/stopped/);assert.equal(await page.locator('audio[src*="file=audio"]').count(),1);
   await page.getByRole('button',{name:'Make another song',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('audio[src*="file=audio"]').length===2);
   const second=page.locator('audio[src*="file=audio"]').nth(1);await second.evaluate(a=>a.play());await audio.first().evaluate(a=>a.play());assert.equal(await second.evaluate(a=>a.paused),true);await audio.first().evaluate(a=>a.pause());
   const nativeHash=createHash('sha256').update(await readFile(new URL('../../../build-finish/taste-test.wav',import.meta.url))).digest('hex');
   const wasmHash=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const worker=new Worker('/studio/taste-worker.js',{type:'module'}),timer=setTimeout(()=>{worker.terminate();reject(Error('WASM comparison timeout'));},120000);
    worker.onmessage=async({data})=>{clearTimeout(timer);worker.terminate();if(data.type==='error'){reject(Error(data.message));return;}
     const bytes=data.files.find(file=>file.name==='taste.wav').bytes;
     resolve(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''));};
    worker.onerror=error=>{clearTimeout(timer);worker.terminate();reject(Error(error.message));};
    worker.postMessage({seed:1,tempo:110,energy:1,instruments:31,novelty:50,seconds:30,direction:0});
   }));assert.equal(wasmHash,nativeHash,'Native and browser composition bytes must match');
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'DNA overflow '+width);if(width!==390)await page.screenshot({path:join(folder,`${name}-dna-${width}.png`),fullPage:true});}
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await page.goto(base+'/studio/dj.html');await revealStudioTools(page);await page.setViewportSize({width:1440,height:1000});await page.locator('#music-rights').check();
   await page.locator('#file-a').setInputFiles(wavPath);await page.locator('#prepare-frames-a').waitFor();await page.waitForFunction(()=>!document.querySelector('#prepare-frames-a').disabled);
   await page.locator('#prepare-frames-a').click();await page.waitForFunction(()=>!document.querySelector('#beat-loop-a').disabled);
   assert.equal(await page.locator('#keylock-a').isDisabled(),false);await page.locator('#bpm-a').fill('110');await page.locator('#loop-beats-a').selectOption('1');
   await page.locator('#play-a').click();await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);
   await page.locator('#beat-roll-a').click();await page.waitForFunction(()=>document.querySelector('#beat-roll-a').getAttribute('aria-pressed')==='true');
   const start=Number(await page.locator('#seek-a').inputValue());await delay(1400);const rolled=Number(await page.locator('#seek-a').inputValue());assert.ok(Math.abs(rolled-start)<.7);
   await page.locator('#loop-exit-a').click();await page.waitForFunction(()=>document.querySelector('#beat-roll-a').getAttribute('aria-pressed')==='false');assert.ok(Number(await page.locator('#seek-a').inputValue())>start+1);
   await page.locator('#rate-a').fill('1.1');assert.match(await page.locator('#rate-value-a').innerText(),/10.0%/);
   await page.locator('#seek-a').fill('0');await page.locator('#beat-loop-a').click();await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);
   await page.locator('#pause-all').click();assert.match(await page.locator('#play-a').innerText(),/Play/);
   await page.locator('#loop-exit-a').click();await page.locator('#seek-a').fill('7');await page.locator('#set-cue-a').click();await page.locator('#hot-a-0').click();
   await page.locator('.deck-a .deck-fx-panel').evaluate(el=>el.open=true);await page.locator('#reverb-a').fill('0.3');await page.locator('#phaser-a').fill('0.2');await page.locator('#flanger-a').fill('0.1');await page.locator('#keylock-a').check();await page.locator('#crossfade-curve').selectOption('smooth');await page.locator('#master').fill('0.42');await page.locator('#remember-set').check();
   await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('saved on this device'));
   await page.reload();await revealStudioTools(page);await page.locator('#music-rights').check();await page.locator('#recovery-restore').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('Set restored'));
   assert.match(await page.locator('#play-a').innerText(),/Play/);assert.equal(Number(await page.locator('#seek-a').inputValue()),7);assert.equal(await page.locator('#crossfade-curve').inputValue(),'smooth');assert.equal(await page.locator('#master').inputValue(),'0.42');assert.equal(await page.locator('#reverb-a').inputValue(),'0.3');assert.equal(await page.locator('#phaser-a').inputValue(),'0.2');assert.equal(await page.locator('#flanger-a').inputValue(),'0.1');assert.equal(await page.locator('#keylock-a').isChecked(),true);
   assert.equal(await page.locator('#keylock-a').isDisabled(),false);await page.locator('#seek-a').fill('2');await page.locator('#cue-a').click();await page.waitForFunction(()=>Number(document.querySelector('#seek-a').value)===7);
   await page.locator('#play-a').click();await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);await page.locator('#pause-all').click();
   await page.locator('#prepare-a').click();await page.waitForFunction(()=>!document.querySelector('#context-confirmed').disabled);
   await page.locator('#session-bpm').fill('110');await page.locator('#session-bpm').dispatchEvent('change');await page.locator('#context-confirmed').check();await page.locator('#phrase-consent').check();
   const source=Buffer.alloc(44+48000*2*2);source.write('RIFF');source.writeUInt32LE(source.length-8,4);source.write('WAVEfmt ',8);source.writeUInt32LE(16,16);source.writeUInt16LE(1,20);source.writeUInt16LE(1,22);source.writeUInt32LE(48000,24);source.writeUInt32LE(96000,28);source.writeUInt16LE(2,32);source.writeUInt16LE(16,34);source.write('data',36);source.writeUInt32LE(source.length-44,40);for(let i=0;i<96000;i++)source.writeInt16LE(Math.round(10000*Math.sin(2*Math.PI*220*i/48000)),44+i*2);
   await page.locator('#phrase-file').setInputFiles({name:'synthetic-phrase.wav',mimeType:'audio/wav',buffer:source});await page.waitForFunction(()=>!document.querySelector('#phrase-generate').disabled);await page.locator('#phrase-generate').click();await page.waitForFunction(()=>!document.querySelector('#performance-download').hidden,null,{timeout:120000});
   async function downloadC(label){const pending=page.waitForEvent('download');await page.locator('#performance-download').click();const file=await pending,path=join(folder,name+'-'+label+'.wav');await file.saveAs(path);return createHash('sha256').update(await readFile(path)).digest('hex');}
   const originalC=await downloadC('original-c');
   await page.locator('#load-instruments').click();await page.waitForFunction(()=>!document.querySelector('#patch').disabled);await page.locator('#patch').selectOption('11');await page.locator('#mouth').fill('0.7');
   await page.locator('#sequence-step-0').selectOption('36');await page.locator('#sequence-step-4').selectOption('40');await page.locator('#sequence-start').click();await page.waitForFunction(()=>document.querySelector('#sequence-status').textContent.includes('playing'));await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);await page.locator('#sequence-stop').click();await page.waitForFunction(()=>document.querySelector('#sequence-stop').disabled);
   await page.locator('#remember-set').check();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('saved on this device'));await page.locator('#scene-slot').selectOption('2');await page.locator('#scene-save').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('Scene saved'));
   await page.reload();await revealStudioTools(page);await page.locator('#music-rights').check();await page.locator('#scene-slot').selectOption('2');await page.locator('#scene-restore').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('Confirm phrase permission'));
   await page.locator('#phrase-consent').check();await page.locator('#scene-restore').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('Set restored'),null,{timeout:30000});
   assert.equal(await page.locator('#mouth').inputValue(),'0.7');assert.equal(await page.locator('#patch').inputValue(),'11');assert.equal(await page.locator('#c-stop').isDisabled(),true);
   const recoveredC=await downloadC('recovered-c');assert.equal(recoveredC,originalC);assert.match(await page.locator('#octave-name').innerText(),/C2/);assert.equal(await page.locator('#sequence-step-0').inputValue(),'36');assert.equal(await page.locator('#sequence-step-4').inputValue(),'40');assert.equal(await page.locator('#sequence-stop').isDisabled(),true);
   await page.locator('#c-preview').click();await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);await page.locator('#c-stop').click();await page.locator('#scene-delete').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('deleted'));
   await page.locator('#recovery-delete').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('deleted'));
   await page.screenshot({path:join(folder,name+'-deck.png'),fullPage:true});
   assert.deepEqual(errors,[]);results.push({browser:name,status:'PASS',duration,sha256:createHash('sha256').update(wav).digest('hex'),nativeWasmSha256:wasmHash,realWasmRender:true,mutedPlayback:true,export:true,cancellationPreservesPreview:true,variationComparison:true,preferences:true,importedBeatControls:true,rollSlipReturn:true,continuousPitch:true,crossfadeCurve:true,savedSetRecovery:true,sampleTimedSequence:true,pausedPatternRecovery:true,preparedCChecksumRecovery:true,namedScene:true,rackRegisterRecovery:true,advancedFXRecall:true,keylockRecall:true,catalogueInference:true,feedbackAdaptation:true,axe:'PASS',widths:[1440,390,320],humanQuality:'NOT RUN',physicalRouting:'NOT RUN'});
  }finally{await browser.close();}
 }
 const evidence=new URL('../../../docs/evidence/non-ios-finish/',import.meta.url);await mkdir(evidence,{recursive:true});await writeFile(new URL('browser.json',evidence),JSON.stringify({folder,results},null,2)+'\n');console.log(JSON.stringify({folder,results}));
}finally{site.kill('SIGTERM');await once(site,'exit');await writeFile(join(folder,'server.log'),log);console.log('Evidence:',folder);}
