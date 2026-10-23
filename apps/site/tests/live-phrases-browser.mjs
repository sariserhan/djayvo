import {revealStudioTools} from '../../web/tests/studio-tools.mjs';
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {join} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import {silenceSpeakers} from './silent-audio.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),folder=await mkdtemp(join(root,'renders/live-phrases-')),base='http://127.0.0.1:4238',results=[];
const site=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4238'],{env:{...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:'',BETTER_AUTH_URL:base},stdio:'ignore'});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/studio/dj.html')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Site unavailable');}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
   await context.addInitScript(()=>{
    window.captured=[];window.starts=[];window.mics=[];window.micMode='normal';
    const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(time,...args){if(this.buffer?.duration>20)window.starts.push({duration:this.buffer.duration,time,rate:this.context.sampleRate});return start.call(this,time,...args);};
    const Worklet=AudioWorkletNode;window.AudioWorkletNode=class extends Worklet{constructor(ctx,name,options){super(ctx,name,options);if(name==='jamloom-phrase-capture'){this.port.addEventListener('message',({data})=>window.captured.push({frames:data.frames,rate:ctx.sampleRate}));this.port.start();}}};
    navigator.mediaDevices.getUserMedia=async()=>{
     if(window.micMode==='deny')throw new DOMException('Test permission denied','NotAllowedError');
     if(window.micMode==='pending')await new Promise(resolve=>window.releaseMic=resolve);
     const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination(),buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=buffer.getChannelData(0);
     for(let i=0;i<ctx.sampleRate*2;i++)samples[i]=.15*Math.sin(i*2*Math.PI*220/ctx.sampleRate);
     const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(dest);source.start();await ctx.resume();window.mics.push({ctx,stream:dest.stream});return dest.stream;
    };
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/studio/dj.html');await revealStudioTools(page);
   const rate=8000,frames=rate*120,wav=Buffer.alloc(44+frames*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(1000*Math.sin(i*2*Math.PI*110/rate)),44+i*2);
   await page.locator('#file-a').setInputFiles({name:'synthetic-bed.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>!document.querySelector('#prepare-a').disabled);await page.locator('#prepare-a').click();await page.waitForFunction(()=>!document.querySelector('#context-confirmed').disabled);
   await page.locator('#session-bpm').fill('120');await page.locator('#session-bpm').dispatchEvent('change');await page.locator('#session-downbeat').fill('0');await page.locator('#context-confirmed').check();await page.locator('#phrase-consent').check();await page.locator('#session-play').click();await page.waitForFunction(()=>!document.querySelector('#session-stop').disabled);
   assert.equal(await page.locator('#live-phrases').isDisabled(),true);await page.locator('#live-headphones').check();await page.locator('#live-phrases').click();await page.waitForFunction(()=>window.captured.length>=1,{},{timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#live-phrase-status').textContent.includes('armed and playing'),{},{timeout:120000});assert.equal(await page.evaluate(()=>window.mics[0].stream.getAudioTracks()[0].enabled),false);
   await page.waitForFunction(()=>window.captured.length>=2,{},{timeout:60000});await page.locator('#live-phrases').click();assert.equal(await page.evaluate(()=>window.mics[0].stream.getAudioTracks()[0].readyState),'ended');
   const data=await page.evaluate(()=>({captured:window.captured,starts:window.starts,outputs:window.__jamloomSilentOutput()}));assert.ok(data.captured.every(c=>c.frames>=c.rate*2&&c.frames<=c.rate*5));const a=data.starts.find(s=>s.duration===120&&Number.isFinite(s.time)),c=data.starts.find(s=>s.duration<40&&Number.isFinite(s.time));assert.ok(a&&c);assert.ok(Math.abs((c.time-a.time)/2-Math.round((c.time-a.time)/2))<1/a.rate);assert.ok(data.outputs.every(o=>o.peak===0&&o.gain===0));
   await page.evaluate(()=>window.micMode='pending');await page.locator('#live-headphones').check();await page.locator('#live-phrases').click();await page.waitForFunction(()=>!!window.releaseMic);await page.locator('#live-phrases').click();await page.evaluate(()=>window.releaseMic());await page.waitForFunction(()=>window.mics.length===2&&window.mics[1].stream.getAudioTracks()[0].readyState==='ended');
   await page.evaluate(()=>window.micMode='deny');await page.locator('#live-headphones').check();await page.locator('#live-phrases').click();await page.waitForFunction(()=>document.querySelector('#performance-error').textContent.includes('denied'));
   await page.evaluate(()=>window.micMode='normal');await page.locator('#live-headphones').check();await page.locator('#live-phrases').click();await page.waitForFunction(()=>window.mics.length===3);await page.evaluate(()=>navigator.mediaDevices.dispatchEvent(new Event('devicechange')));await page.waitForFunction(()=>window.mics[2].stream.getAudioTracks()[0].readyState==='ended');
   await page.locator('#live-headphones').check();await page.locator('#live-phrases').click();await page.waitForFunction(()=>window.mics.length===4);await page.locator('#phrase-consent').uncheck();await page.waitForFunction(()=>window.mics[3].stream.getAudioTracks()[0].readyState==='ended');assert.equal(await page.locator('#live-phrases').isDisabled(),true);
   await page.locator('#session-stop').click();for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.screenshot({path:join(folder,name+'-320.png'),fullPage:true});assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);assert.deepEqual(errors,[]);
   results.push({browser:name,status:'PASS',...data,checks:['two actual worklet phrase endpoints','real WASM response','shared-clock bar entry','capture disabled during C','automatic next phrase','explicit stop','late permission cleanup','denied permission','device change','consent revocation','responsive and axe','physical outputs muted']});console.log(name,'PASS');
  }finally{await browser.close();}
 }
 await mkdir(join(root,'docs/evidence/live-phrases'),{recursive:true});await writeFile(join(root,'docs/evidence/live-phrases/browser.json'),JSON.stringify({status:'PASS',results,physical_latency:'NOT RUN',human_quality:'NOT RUN'},null,2)+'\n');
}finally{site.kill();}
