import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from '../../site/tests/silent-audio.mjs';
const root=resolve('dist/web'),out=await mkdtemp(join(tmpdir(),'jamloom-deck-dsp-'));
const probe=`import {DeckDSP} from './deck-dsp.js';
class Probe extends AudioWorkletProcessor {
 constructor(o){super();const p=o.processorOptions;this.dsp=new DeckDSP(p.channels,sampleRate);this.dsp.speed=p.speed;this.dsp.keylock=p.keylock;this.dsp.playing=true;this.pcm=new Float32Array(sampleRate*2);this.times=new Float64Array(Math.ceil(this.pcm.length/128));this.at=0;this.block=0;}
 process(_,outputs){if(this.at>=this.pcm.length)return false;const before=Date.now();this.dsp.process(outputs[0]);this.times[this.block++]=Date.now()-before;this.pcm.set(outputs[0][0].subarray(0,Math.min(128,this.pcm.length-this.at)),this.at);this.at+=128;if(this.at>=this.pcm.length)this.port.postMessage({pcm:this.pcm,times:this.times,position:this.dsp.position},[this.pcm.buffer,this.times.buffer]);return true;}
}registerProcessor('probe',Probe);`;
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/probe.js'){res.setHeader('Content-Type','text/javascript');res.end(probe);return;}
 if(pathname==='/probe.html'){res.end('<!doctype html><title>Jamloom DSP test</title><button>Start</button>');return;}
 const path=resolve(root,'.'+pathname);if(!path.startsWith(root+'/'))throw Error('path');const bytes=await readFile(path);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.wasm')?'application/wasm':path.endsWith('.css')?'text/css':'text/html');res.end(bytes);
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,results=[];
try{for(const [name,engine] of Object.entries({chromium,webkit})){const browser=await engine.launch();try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(silenceSpeakers);await page.goto(base+'/probe.html');
 const metrics=await page.evaluate(async()=>{const ctx=new AudioContext({sampleRate:48000}),rate=ctx.sampleRate;await ctx.audioWorklet.addModule('/probe.js');const channels=[Float32Array.from({length:rate*4},(_,i)=>.4*Math.sin(2*Math.PI*440*i/rate))],mute=ctx.createGain();mute.gain.value=0;mute.connect(ctx.destination);await ctx.resume();
 const results=[];for(const keylock of [false,true]){const result=await new Promise((resolve,reject)=>{const n=new AudioWorkletNode(ctx,'probe',{numberOfInputs:0,outputChannelCount:[2],processorOptions:{channels,speed:1.16,keylock}});const timer=setTimeout(()=>reject(Error('Audio probe timed out')),12000);n.onprocessorerror=()=>reject(Error('Processor error'));n.port.onmessage=({data})=>{clearTimeout(timer);n.disconnect();resolve(data);};n.connect(mute);});let crossings=0,peak=0,maxJump=0;for(let i=4097;i<result.pcm.length;i++){if(result.pcm[i-1]<=0&&result.pcm[i]>0)crossings++;peak=Math.max(peak,Math.abs(result.pcm[i]));maxJump=Math.max(maxJump,Math.abs(result.pcm[i]-result.pcm[i-1]));}results.push({keylock,pitch:crossings*rate/(result.pcm.length-4096),peak,maxJump,position:result.position,maxBlockMs:Math.max(...result.times),overDeadline:[...result.times].filter(t=>t>128/rate*1000).length});}await ctx.close();return results;});
 const effectMetrics=await page.evaluate(async()=>{
  const {createDeckEffects,updateDeckEffects,clearDeckEffects}=await import('/deck-effects.js'),result=[];
  for(const name of ['dry','reverb','phaser','flanger','reset']){
   const ctx=new OfflineAudioContext(2,48000,48000),fx=createDeckEffects(ctx,ctx.destination),source=ctx.createBufferSource(),buffer=ctx.createBuffer(1,48000,48000),pcm=buffer.getChannelData(0);
   for(let i=0;i<24000;i++)pcm[i]=.3*Math.sin(2*Math.PI*(220*i/48000+1500*(i/48000)**2));
   source.buffer=buffer;source.connect(fx.input);const values={reverb:0,phaser:0,flanger:0};if(name!=='dry'&&name!=='reset')values[name]=.5;updateDeckEffects(ctx,fx,values);if(name==='reset')clearDeckEffects(ctx,fx);source.start();const started=performance.now(),rendered=await ctx.startRendering(),out=rendered.getChannelData(0);let difference=0,tail=0,peak=0;
   for(let i=0;i<out.length;i++){if(!Number.isFinite(out[i]))throw Error('Nonfinite effect output');peak=Math.max(peak,Math.abs(out[i]));difference+=(out[i]-pcm[i])**2;if(i>=25000)tail+=out[i]**2;}
   result.push({name,difference,tail,peak,renderMs:performance.now()-started});
  }return result;
 });
 assert.equal(effectMetrics[0].difference,0);assert.equal(effectMetrics[4].difference,0);for(const m of effectMetrics.slice(1,4)){assert.ok(m.difference>1);assert.ok(m.peak<1);}assert.ok(effectMetrics[1].tail>0);
 assert.ok(Math.abs(metrics[0].pitch-510.4)<3);assert.ok(Math.abs(metrics[1].pitch-440)<3);assert.ok(metrics.every(m=>m.peak<=.401&&m.maxJump<.06));
 await page.goto(base+'/dj.html');await page.locator('#music-rights').check();
 const wav=Buffer.alloc(44+48000*4*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<48000*4;i++)wav.writeInt16LE(Math.round(10000*Math.sin(2*Math.PI*440*i/48000)),44+i*2);
 await page.locator('#file-a').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>!document.querySelector('#prepare-frames-a').disabled);await page.locator('#prepare-frames-a').click();await page.waitForFunction(()=>!document.querySelector('#keylock-a').disabled&&document.querySelector('#error-a').textContent.includes('scratch ready'));
 await page.locator('#keylock-a').check();await page.locator('#rate-a').fill('1.1');await page.locator('#play-a').click();await page.waitForFunction(()=>document.querySelector('#output-meter').value>0);await page.locator('#play-a').click();await page.locator('#seek-a').fill('2');
 const box=await page.locator('#jog-a').boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.mouse.down();await page.waitForTimeout(60);await page.mouse.move(box.x+box.width*.5,box.y+box.height*.2,{steps:8});await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(80);assert.ok(Number(await page.locator('#seek-a').inputValue())<2);assert.match(await page.locator('#play-a').innerText(),/Play/);
 await page.screenshot({path:join(out,name+'-deck.png'),fullPage:true});assert.deepEqual(errors,[]);results.push({browser:name,metrics,effectMetrics,renderedKeylock:true,scratchBackwards:true,releasedPaused:true});
 }finally{await browser.close();}}await writeFile(join(out,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({out,results},null,2));}finally{server.close();}
