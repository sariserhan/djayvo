import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {_electron} from '../../web/node_modules/playwright/index.mjs';
const require=createRequire(import.meta.url),here=fileURLToPath(new URL('../',import.meta.url));
await fs.mkdir(path.resolve(here,'../../renders'),{recursive:true});
const out=await fs.mkdtemp(path.resolve(here,'../../renders/pro-endurance-')),profile=await fs.mkdtemp(path.join(os.tmpdir(),'jamloom-endurance-'));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const samples=[],errors=[];let app,diagnostics;
console.log('Evidence:',out);
try{
 app=await _electron.launch({executablePath:require('electron'),args:[here,'--user-data-dir='+profile,'--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],env});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.setAudioMuted(true)));
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 await page.waitForSelector('#sample-pad-7',{state:'attached'});
 await page.evaluate(()=>{window.enduranceEvents=[];for(const kind of ['click','change'])document.addEventListener(kind,event=>window.enduranceEvents.push({at:Date.now(),kind,id:event.target.id,trusted:event.isTrusted}),true);window.enduranceContexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.enduranceContexts.push(this);this.addEventListener('statechange',()=>window.enduranceEvents.push({at:Date.now(),kind:'context',state:this.state}));}};for(const id of ['audio-a','audio-b'])for(const kind of ['play','pause','ended','error','waiting','stalled','suspend','abort','emptied'])document.getElementById(id).addEventListener(kind,()=>{window.enduranceEvents.push({at:Date.now(),id,kind});if(window.enduranceEvents.length>1000)window.enduranceEvents.shift();});});
 const rate=48000,n=rate*8,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*2*Math.PI*220/rate)*6000,44+i*2);
 for(const deck of ['a','b']){await page.locator('#file-'+deck).setInputFiles({name:'owned-test-tone.wav',mimeType:'audio/wav',buffer:b});await page.waitForFunction(id=>!document.getElementById('play-'+id).disabled,deck);await page.locator('#loop-'+deck).click();await page.locator('#play-'+deck).click();}
 await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
 const began=performance.now();let previous;
 while(performance.now()-began<3600000){
  await page.waitForTimeout(10000);
  const value=await page.evaluate(()=>({a:document.querySelector('#audio-a').currentTime,b:document.querySelector('#audio-b').currentTime,playing:[...document.querySelectorAll('.deck')].map(n=>n.dataset.playing),peak:Number(document.querySelector('#output-meter').value)}));
  diagnostics=await page.evaluate(()=>({at:Date.now(),status:document.querySelector('#mixer-status').textContent,visibility:document.visibilityState,contexts:window.enduranceContexts.map(c=>({state:c.state,time:c.currentTime,sink:c.sinkId})),media:['audio-a','audio-b'].map(id=>{const a=document.getElementById(id);return {id,paused:a.paused,ended:a.ended,loop:a.loop,ready:a.readyState,network:a.networkState,error:a.error?.message};}),events:window.enduranceEvents.slice(-60)}));
  const memory=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({type:p.type,rssKB:p.memory.workingSetSize})));
  samples.push({seconds:(performance.now()-began)/1000,...value,memory});
  assert.ok(value.playing.every(v=>v==='true'),'Both decks must remain playing');assert.ok(Number.isFinite(value.peak)&&value.peak>.001&&value.peak<=1,'Output signal stays finite and bounded');
  if(previous)assert.ok(Math.abs(value.a-previous.a)>.01&&Math.abs(value.b-previous.b)>.01,'Both playback clocks advance');
  previous=value;
  if(samples.length%6===0){const blend=(samples.length/6%5)/4;await page.locator('#crossfade').fill(String(blend));await page.locator('#crossfade').dispatchEvent('input');console.log('PASS elapsed',Math.round(samples.at(-1).seconds),'seconds');await fs.writeFile(path.join(out,'progress.json'),JSON.stringify(samples));}
 }
 await page.locator('#pause-all').click();assert.deepEqual(errors,[]);
 const rss=samples.map(s=>s.memory.reduce((sum,p)=>sum+p.rssKB,0));assert.ok(Math.max(...rss)<1500*1024,'App stays below 1.5 GiB');assert.ok(rss.at(-1)-rss[5]<350*1024,'Memory growth bounded after warmup');
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:'PASS',diagnostics,seconds:samples.at(-1).seconds,samples,errors,maxRSSMiB:Math.max(...rss)/1024,physicalOutput:'muted',physicalRouting:'NOT RUN',scope:'Two real-time local decks, loops, crossfader, signal and memory over one hour'},null,2));
 console.log('PASS full real-time hour',out);
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({message:error.message,samples,errors,diagnostics},null,2));throw error;}
finally{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}
