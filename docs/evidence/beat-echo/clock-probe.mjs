import { chromium } from '../../../apps/web/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
const server=createServer(async(req,res)=>{
 if(req.url==='/session-probe.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(new URL('../../../apps/web/tests/session-probe.js', import.meta.url)));}
 else {res.setHeader('Content-Type','text/html');res.end('<h1>Clock probe</h1>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
const timeout=setTimeout(()=>browser.close(),30000);
try {
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{document.querySelector('h1').onclick=()=>{window.probeContext=new AudioContext();window.probeContext.resume();};});
 await page.locator('h1').click();
 await page.waitForFunction(()=>probeContext.state==='running',null,{timeout:5000});
 const result=await page.evaluate(async()=>{
  const context=window.probeContext;await context.audioWorklet.addModule('./session-probe.js');
  const probe=new AudioWorkletNode(context,'continuity-probe',{numberOfInputs:2});
  const mute=context.createGain();mute.gain.value=0;probe.connect(mute);mute.connect(context.destination);
  const tone=context.createOscillator();const level=context.createGain();level.gain.value=.1;tone.connect(level);level.connect(probe);tone.start();
  const ref=context.createBufferSource();ref.buffer=context.createBuffer(1,60*context.sampleRate,context.sampleRate);
  const samples=ref.buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(i+1)/8388608;
  ref.connect(probe,0,1);ref.start();await context.resume();
  await new Promise(r=>setTimeout(r,200));probe.port.postMessage('start');
  const nodes=Array.from({length:50},()=>[context.createGain(),context.createDelay(2.4)]);
  const timer=setInterval(()=>{for(const [gain,delay] of nodes){gain.connect(delay);delay.disconnect();gain.disconnect();}},10);
  await new Promise(r=>setTimeout(r,15000));clearInterval(timer);
  const result=await new Promise(r=>{probe.port.onmessage=({data})=>r(data);probe.port.postMessage('report');});
  await context.close();return result;
 });
 assert.ok(result.blocks>100);assert.equal(result.silent,0);assert.equal(result.signalFrameGaps,0);assert.equal(result.signalFrames,result.processedFrames);
 await fs.writeFile('/tmp/djayvo-clock-probe.json',JSON.stringify({browser:browser.version(),...result},null,2));console.log(JSON.stringify(result));
} finally {clearTimeout(timeout);await browser.close();await new Promise(r=>server.close(r));}
