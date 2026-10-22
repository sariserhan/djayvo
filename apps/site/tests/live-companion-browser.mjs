// Real native HTTP, explicitly synthetic telemetry. No system audio capture.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import {silenceSpeakers} from './silent-audio.mjs';
const base='http://127.0.0.1:4234',local='http://127.0.0.1:48191',folder=await mkdtemp(join(tmpdir(),'jamloom-live-qa-')),results=[];
const pageOrigin=process.env.JAMLOOM_LIVE_ORIGIN??base;assert.ok([base,'https://www.jamloom.com'].includes(pageOrigin));
const site=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4234'],{env:{...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:'',BETTER_AUTH_URL:base},stdio:['ignore','pipe','pipe']});let serverLog='';site.stdout.on('data',b=>serverLog+=b);site.stderr.on('data',b=>serverLog+=b);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/live-dj')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Site unavailable');}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const grant=join(folder,name+'-grant.json');let nativeLog='';
  const native=spawn('swift',['test','--package-path',resolve('../desktop-companion'),'--filter','BrowserFixtureTests/testLocalControlFixture'],{env:{...process.env,JAMLOOM_LIVE_FIXTURE:grant,JAMLOOM_LIVE_ORIGIN:pageOrigin},stdio:['ignore','pipe','pipe']});native.stdout.on('data',b=>nativeLog+=b);native.stderr.on('data',b=>nativeLog+=b);const nativeExit=once(native,'exit');let browser,page,failure;
  try{
   let token;for(let i=0;i<300;i++){try{token=JSON.parse(await readFile(grant,'utf8')).token;break;}catch{}if(native.exitCode!==null)throw Error(nativeLog);await delay(100);}assert.ok(token,'Native fixture ready');
   assert.equal((await fetch(local+'/status',{headers:{Origin:'https://evil.example',Authorization:'Bearer '+token}})).status,403);
   assert.equal((await fetch(local+'/status',{headers:{Origin:pageOrigin,Authorization:'Bearer bad'}})).status,401);
   browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(silenceSpeakers);if(pageOrigin!==base&&name==='chromium')await context.grantPermissions(['local-network-access'],{origin:pageOrigin});
   await context.route('**/*',async r=>{const url=new URL(r.request().url());if(url.protocol==='blob:')return r.continue();if(url.origin===local)return r.continue();if(url.origin!==pageOrigin)return r.abort();if(pageOrigin===base)return r.continue();const response=await context.request.fetch(base+url.pathname+url.search,{method:r.request().method(),data:r.request().postDataBuffer()??undefined});await r.fulfill({response});});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(name,m.text());});
   await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{value:async()=>{throw new DOMException('Permission denied','NotAllowedError');},configurable:true});});
   await page.goto(pageOrigin+'/live-dj');await page.getByLabel('Pairing code').fill(token);assert.equal(new URL(page.url()).hash,'');
   const fallback=page.locator('section').filter({has:page.getByRole('heading',{name:'Browser Live Source',exact:true})});
   await fallback.getByLabel('I have permission').check();await fallback.getByRole('button',{name:'Select tab audio'}).click();await page.waitForFunction(()=>/Permission denied|supplied no audio/.test(Array.from(document.querySelectorAll('[role=status]')).map(e=>e.textContent).join(' ')));
   await page.getByRole('button',{name:'Connect companion',exact:true}).click();
   if(pageOrigin!==base&&name==='webkit'){
    await Promise.race([page.waitForFunction(()=>!document.querySelector('.live-mixer').disabled),page.getByText(/Could not connect/).waitFor()]);
    if(await page.getByText(/Could not connect/).isVisible()){
     assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),false);
     const headers={Origin:pageOrigin,Authorization:'Bearer '+token};const telemetry=await(await fetch(local+'/status',{headers})).json();
     assert.equal((await fetch(local+'/controls',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(telemetry.controls)})).status,200);
     assert.equal((await fetch(local+'/stop',{method:'POST',headers})).status,200);
     await page.screenshot({path:join(folder,name+'-secure-origin-unavailable.png'),fullPage:true});
     results.push({browser:name,status:'PARTIAL',pageOrigin,secureOriginFixture:true,hostedDeployment:'NOT RUN',secureBrowserControls:'UNAVAILABLE: browser rejected loopback request',gracefulFallback:'PASS',nativeHTTP:'PASS via test harness',realSystemCapture:'NOT RUN'});continue;
    }
   }
   await page.waitForFunction(()=>!document.querySelector('.live-mixer').disabled);assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),true);
   const telemetry=async()=>await(await fetch(local+'/status',{headers:{Origin:pageOrigin,Authorization:'Bearer '+token}})).json();
   await page.getByLabel('Deck A Low EQ (dB)',{exact:true}).fill('-12');
   await page.getByRole('button',{name:'Deck A Beat loop',exact:true}).click();
   await page.getByRole('button',{name:'Deck A Percussion',exact:true}).click();
   await page.getByRole('button',{name:'Deck A Bypass FX',exact:true}).click();await delay(200);
   let state=await telemetry();assert.equal(state.protocolVersion,2);assert.equal(state.controls.decks[0].low,-12);assert.equal(state.controls.decks[0].roll,true);assert.equal(state.controls.decks[0].bypass,true);assert.equal(state.controls.decks[1].low,0);
   await page.getByLabel('Master level',{exact:true}).fill('0.25');await page.getByLabel('Crossfader',{exact:true}).fill('0.8');await delay(150);
   state=await telemetry();assert.equal(state.controls.master,.25);assert.equal(state.controls.crossfader,.8);assert.equal(state.controls.decks[0].bypass,true,'master preserves bypass');
   for(const [label,value,key] of [['Low EQ (dB)','-18','low'],['Mid EQ (dB)','-15','mid'],['High EQ (dB)','-9','high'],['Low-pass (Hz)','700','tone'],['High-pass (Hz)','500','highpass'],['Echo','0.35','echo'],['Echo time (s)','0.5','echoSeconds']]){
    const bypass=page.getByRole('button',{name:'Deck A Bypass FX',exact:true});if(await bypass.getAttribute('aria-pressed')==='false')await bypass.click();
    await page.getByLabel('Deck A '+label,{exact:true}).fill(value);await delay(120);
    const applied=(await telemetry()).controls;
    assert.equal(applied.decks[0][key],Number(value));assert.equal(applied.decks[0].bypass,false,label+' re-enables FX');
    assert.equal(applied.decks[1][key],state.controls.decks[1][key],'other deck stays independent');
   }
   await page.getByRole('button',{name:'Deck B Reverse',exact:true}).click();await page.getByRole('button',{name:'Deck B Mute',exact:true}).click();
   await page.getByLabel('Deck B Loop length',{exact:true}).selectOption('4');await page.getByLabel('Deck B FX tempo (BPM)',{exact:true}).fill('90');await delay(150);
   state=await telemetry();assert.equal(state.controls.decks[1].reverse,true);assert.equal(state.controls.decks[1].mute,true);assert.equal(state.controls.decks[1].loopBeats,4);assert.equal(state.controls.decks[1].tempo,90);assert.equal(state.controls.decks[0].reverse,false);
   await page.getByRole('button',{name:'Deck B Return to live',exact:true}).click();await delay(100);assert.equal((await telemetry()).controls.decks[1].reverse,false);
   const platter=page.getByRole('button',{name:'Deck A platter',exact:true});await platter.scrollIntoViewIfNeeded();const box=await platter.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
   await page.mouse.move(cx+80,cy);await page.mouse.down();await delay(50);await page.mouse.move(cx,cy-80,{steps:4});await delay(40);
   state=await telemetry();assert.equal(state.controls.decks[0].scratch,true);assert.ok(state.controls.decks[0].scratchRate<0,'counterclockwise drag scratches backward');
   await delay(160);assert.equal((await telemetry()).controls.decks[0].scratchRate,0,'holding platter still silences movement');
   await page.mouse.up();await delay(100);assert.equal((await telemetry()).controls.decks[0].scratch,false);
   await page.mouse.down();await platter.dispatchEvent('pointercancel');await page.mouse.up();await delay(100);assert.equal((await telemetry()).controls.decks[0].scratch,false,'cancel releases platter');
   await page.emulateMedia({reducedMotion:'no-preference'});const angleBefore=await platter.locator('.platter-label').evaluate(e=>getComputedStyle(e).transform);await delay(200);assert.notEqual(await platter.locator('.platter-label').evaluate(e=>getComputedStyle(e).transform),angleBefore,'live record rotates');await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await platter.locator('.platter-label').evaluate(e=>getComputedStyle(e).animationName),'none','reduced motion respected');
   assert.equal((await fetch(local+'/sampler',{method:'POST',headers:{Origin:pageOrigin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'record'})})).status,400,'website cannot start a microphone');
   await page.getByRole('button',{name:'Play sample on B',exact:true}).click();await delay(150);assert.deepEqual((await telemetry()).sampler.playing,[1]);
   await page.getByRole('button',{name:'Stop sample',exact:true}).click();await delay(150);assert.deepEqual((await telemetry()).sampler.playing,[]);
   await page.getByRole('button',{name:'Play sample on A',exact:true}).click();await delay(150);assert.deepEqual((await telemetry()).sampler.playing,[0]);
   await page.getByRole('button',{name:'Clear sample',exact:true}).click();await delay(150);assert.equal((await telemetry()).sampler.ready,false);assert.equal(await page.getByRole('button',{name:'Play sample on A',exact:true}).isDisabled(),true);
   // A status response captured before an edit must not roll the control back.
   let captured=false,ready,finished;
   const statusReady=new Promise(resolve=>ready=resolve),statusFinished=new Promise(resolve=>finished=resolve);
   const staleStatus=async route=>{if(captured)return route.continue();captured=true;const response=await route.fetch();const snapshot=await response.json();ready();await delay(900);await route.fulfill({json:snapshot});finished();};
   await page.route(local+'/status',staleStatus);await statusReady;
   await page.getByLabel('Deck A Low EQ (dB)',{exact:true}).fill('-21');await page.getByLabel('Deck A Echo',{exact:true}).fill('0.3');
   await statusFinished;await delay(100);
   assert.equal(await page.getByLabel('Deck A Low EQ (dB)',{exact:true}).inputValue(),'-21');assert.equal(await page.getByLabel('Deck A Echo',{exact:true}).inputValue(),'0.3');
   await page.unroute(local+'/status',staleStatus);
   assert.equal(await page.locator('.live-fx-status strong').first().innerText(),'FX ON');

   for(const width of [1440,820,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);if(width!==390)await page.screenshot({path:join(folder,`${name}-${width}.png`),fullPage:true});}
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await page.getByRole('button',{name:'Stop native capture / panic',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('Capture stopped ·'));
   await page.getByRole('button',{name:'Disconnect companion',exact:true}).click();await page.getByText('Disconnected. Native capture is stopped.',{exact:true}).waitFor();assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),false);
   await page.getByLabel('Pairing code').fill(token);await page.getByRole('button',{name:'Connect companion',exact:true}).click();await page.getByRole('button',{name:'Disconnect companion',exact:true}).waitFor();
   await context.route(local+'/**',r=>r.abort());await page.getByText(/Connection lost/).waitFor();assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),true);
   await page.getByLabel('Pairing code').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect companion',exact:true}).click();await page.getByText(/Could not connect/).waitFor();assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),true);await delay(8500);assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),false);assert.deepEqual(errors,[]);await context.close();
   results.push({browser:name,status:'PASS',pageOrigin,secureOriginFixture:pageOrigin!==base,hostedDeployment:'NOT RUN',realNativeHTTP:true,syntheticTelemetry:true,realSystemCapture:'NOT RUN',pairingAndOrigin:'PASS',controlsAndPanic:'PASS',samplerPlaybackAndClear:'PASS',remoteRecordingRejected:'PASS',dualDeckIsolation:'PASS',crossfaderAndMaster:'PASS',platterGestureAndRelease:'PASS',rotationAndReducedMotion:'PASS',allEffectControls:'PASS',bypassRecovery:'PASS',staleStatusDuringEdit:'PASS',browserFallback:'PASS',lostConnectionHandoff:'PASS',invalidToken:'PASS',widths:[1440,820,390,320],axe:'PASS',noAudioOutput:'PASS'});
  }catch(error){failure=error;console.error(error);if(page){console.error(await page.locator('[role=status]').allTextContents());await page.screenshot({path:join(folder,name+'-failure.png'),fullPage:true});}throw error;}finally{await browser?.close();await writeFile(grant+'.done','done');const [code]=await nativeExit;await writeFile(join(folder,name+'-native.log'),nativeLog);if(!failure)assert.equal(code,0,nativeLog);}
 }
 await writeFile(join(folder,'results.json'),JSON.stringify({status:results.some(r=>r.status==='PARTIAL')?'PARTIAL':'PASS',results},null,2)+'\n');console.log(JSON.stringify({folder,results}));
}finally{if(site.exitCode===null&&site.signalCode===null){const exited=once(site,'exit');site.kill('SIGTERM');await exited;}await writeFile(join(folder,'server.log'),serverLog);console.log('Evidence:',folder);}
