// Real native HTTP, explicitly synthetic telemetry. No system audio capture.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import {silenceSpeakers} from './silent-audio.mjs';
const base='http://127.0.0.1:4234',local='http://127.0.0.1:48191',folder=await mkdtemp(join(tmpdir(),'jamloom-live-qa-')),results=[];
const site=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4234'],{env:{...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:'',BETTER_AUTH_URL:base},stdio:['ignore','pipe','pipe']});let serverLog='';site.stdout.on('data',b=>serverLog+=b);site.stderr.on('data',b=>serverLog+=b);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/live-dj')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Site unavailable');}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const grant=join(folder,name+'-grant.json');let nativeLog='';
  const native=spawn('swift',['test','--package-path',resolve('../desktop-companion'),'--filter','BrowserFixtureTests/testLocalControlFixture'],{env:{...process.env,JAMLOOM_LIVE_FIXTURE:grant},stdio:['ignore','pipe','pipe']});native.stdout.on('data',b=>nativeLog+=b);native.stderr.on('data',b=>nativeLog+=b);const nativeExit=once(native,'exit');let browser,page,failure;
  try{
   let token;for(let i=0;i<300;i++){try{token=JSON.parse(await readFile(grant,'utf8')).token;break;}catch{}if(native.exitCode!==null)throw Error(nativeLog);await delay(100);}assert.ok(token,'Native fixture ready');
   assert.equal((await fetch(local+'/status',{headers:{Origin:'https://evil.example',Authorization:'Bearer '+token}})).status,403);
   assert.equal((await fetch(local+'/status',{headers:{Origin:base,Authorization:'Bearer bad'}})).status,401);
   browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(silenceSpeakers);
   await context.route('**/*',r=>[base,local].includes(new URL(r.request().url()).origin)?r.continue():r.abort());page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{value:async()=>{throw new DOMException('Permission denied','NotAllowedError');},configurable:true});});
   await page.goto(base+'/live-dj');await page.getByLabel('Pairing code').fill(token);assert.equal(new URL(page.url()).hash,'');
   const fallback=page.locator('section').filter({has:page.getByRole('heading',{name:'Browser Live Source',exact:true})});
   await fallback.getByLabel('I have permission').check();await fallback.getByRole('button',{name:'Select tab audio'}).click();await page.waitForFunction(()=>/Permission denied|supplied no audio/.test(document.querySelectorAll('[role=status]')[1].textContent));
   await page.getByRole('button',{name:'Connect companion',exact:true}).click();await page.getByRole('button',{name:'Stop native capture / panic',exact:true}).waitFor();assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),true);
   await page.getByLabel('Low EQ (dB)').fill('-12');await page.getByLabel('One-beat roll',{exact:true}).check();await page.getByLabel('Follow a steady pulse with percussion',{exact:true}).check();await page.getByLabel('Bypass native effects',{exact:true}).check();await delay(200);
   const status=await (await fetch(local+'/status',{headers:{Origin:base,Authorization:'Bearer '+token}})).json();assert.equal(status.controls.low,-12);assert.equal(status.controls.roll,true);assert.equal(status.controls.percussion,true);assert.equal(status.controls.bypass,true);
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);if(width!==390)await page.screenshot({path:join(folder,`${name}-${width}.png`),fullPage:true});}
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await page.getByRole('button',{name:'Stop native capture / panic',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('Capture stopped ·'));
   await page.getByRole('button',{name:'Disconnect companion',exact:true}).click();assert.equal(await fallback.getByRole('button',{name:'Select tab audio'}).isDisabled(),false);
   await page.getByLabel('Pairing code').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect companion',exact:true}).click();await page.getByText(/Could not connect/).waitFor();assert.deepEqual(errors,[]);await context.close();
   results.push({browser:name,realNativeHTTP:true,syntheticTelemetry:true,realSystemCapture:'NOT RUN',pairingAndOrigin:'PASS',controlsAndPanic:'PASS',browserFallback:'PASS',invalidToken:'PASS',widths:[1440,390,320],axe:'PASS',noAudioOutput:'PASS'});
  }catch(error){failure=error;console.error(error);if(page){console.error(await page.locator('[role=status]').allTextContents());await page.screenshot({path:join(folder,name+'-failure.png'),fullPage:true});}throw error;}finally{await browser?.close();await writeFile(grant+'.done','done');const [code]=await nativeExit;await writeFile(join(folder,name+'-native.log'),nativeLog);if(!failure)assert.equal(code,0,nativeLog);}
 }
 await writeFile(join(folder,'results.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');console.log(JSON.stringify({folder,results}));
}finally{site.kill('SIGTERM');await once(site,'exit');await writeFile(join(folder,'server.log'),serverLog);console.log('Evidence:',folder);}
