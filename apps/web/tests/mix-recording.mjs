import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { stereoWav, sha256 } from '../live-take.js';
import { validateMixRecording } from '../mix-recording.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.JAMLOOM_BROWSER || 'chromium'; assert.ok(['chromium','webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/mix-recording-${kind}-`));
console.log('Artifacts:', output);
const publicRoot = path.join(root, 'dist/web'), errors = [], external = [], checks = [], warnings = [];
let takingScreenshot = false;
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://local').pathname.slice(1);
  if (req.method !== 'GET' || !/^[\w./-]+$/.test(name) || name.split('/').includes('..')) { res.writeHead(404); res.end(); return; }
  try {
    const bytes = await fs.readFile(path.join(publicRoot, name));
    res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml'})[path.extname(name)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'" });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/dj.html`;
let browser;
try {
  browser = await {chromium,webkit}[kind].launch();
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(() => {
    const Native = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends Native { constructor(c, name, options) {
      super(c, name, options); if (name === 'jamloom-mix-recording') window.mixNode = this;
    } };
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (takingScreenshot && kind === 'webkit' && m.text().startsWith('Refused to apply a stylesheet')) warnings.push(m.text());
    else errors.push(m.text());
  });
  page.on('request', r => { if (!r.url().startsWith(url.replace('/dj.html','/')) && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.goto(url);
  assert.equal(await page.title(), 'Jamloom — DJ workspace');
  assert.equal(await page.locator('#mix-record-start').isDisabled(), true);
  const reference = await page.evaluate(async () => {
    const { createMixer, updateToneEcho } = await import('./mixer.js');
    const { stereoWav, sha256 } = await import('./live-take.js');
    const context = new OfflineAudioContext(2, 48000, 48000), mixer = createMixer(context);
    await context.audioWorklet.addModule('./mix-recording-worklet.js');
    const node = new AudioWorkletNode(context,'jamloom-mix-recording',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    const sink=context.createGain(); sink.gain.value=0; mixer.meter.connect(node); node.connect(sink); sink.connect(context.destination);
    const done=new Promise(resolve=>{node.port.onmessage=({data})=>{if(data.type==='complete')resolve(data);};});
    // Independently route A, B, C and rack into the actual mixer, with effects and fader automation.
    const routes=[mixer.strips[0],mixer.strips[1],{input:mixer.performanceFX.input,fx:mixer.performanceFX},{input:mixer.rackFX.input,fx:mixer.rackFX}];
    [mixer.channels[0],mixer.channels[1],mixer.performance,mixer.rack].forEach((gain,i)=>{
      gain.gain.value=.9; gain.gain.setValueAtTime(.2+i*.1,.25); gain.gain.setValueAtTime(0,.5);
    });
    routes.forEach((route,i)=>{
      updateToneEcho(context,route.fx,70+i*10,.3,100);
      const source=context.createBufferSource(), buffer=context.createBuffer(2,48000,48000);
      for(let f=0;f<48000;f++) {
        buffer.getChannelData(0)[f]=.5*Math.cos(2*Math.PI*(110+i*37)*f/48000);
        buffer.getChannelData(1)[f]=.3*Math.sin(2*Math.PI*(170+i*53)*f/48000);
      }
      source.buffer=buffer; source.connect(route.input); source.start();
    });
    const stop=context.suspend(.75).then(()=>{node.port.postMessage({type:'stop'});return context.resume();});
    const rendered=await context.startRendering(); await stop;
    let timeout; const data=await Promise.race([done,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Offline recorder did not finish')),5000);})]); clearTimeout(timeout);
    let maximum=0,square=0,peak=0,tail=0,stereoDifference=0;
    const expected=new Float32Array(data.frames*2);
    for(let f=0;f<data.frames;f++) for(let c=0;c<2;c++) {
      const want=rendered.getChannelData(c)[data.first+f], got=data.samples[f*2+c], diff=got-want;
      expected[f*2+c]=want; maximum=Math.max(maximum,Math.abs(diff)); square+=diff*diff;
      peak=Math.max(peak,Math.abs(got)); if(f>28800)tail=Math.max(tail,Math.abs(got));
      if(c===1)stereoDifference=Math.max(stereoDifference,Math.abs(got-data.samples[f*2]));
    }
    const wav=stereoWav(data.samples,data.frames,data.rate), reference=stereoWav(expected,data.frames,data.rate);
    const bytes=new Uint8Array(wav); let binary=''; for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    return {maximum,rms:Math.sqrt(square/(data.frames*2)),frames:data.frames,first:data.first,
      timestampDiscontinuities:data.discontinuities,peak,tail,stereoDifference,
      capturedHash:await sha256(wav),referenceHash:await sha256(reference),wav:btoa(binary)};
  });
  assert.equal(reference.maximum,0); assert.equal(reference.rms,0); assert.equal(reference.first,0);
  assert.equal(reference.capturedHash,reference.referenceHash);
  assert.ok(reference.frames>=36000 && reference.frames<=48000);
  assert.ok(reference.peak>.8 && reference.peak<1 && reference.tail===0 && reference.stereoDifference>.01);
  await fs.writeFile(path.join(output,'post-limiter-reference.wav'),Buffer.from(reference.wav,'base64')); delete reference.wav;
  checks.push('actual four-channel mixer tap matches destination PCM exactly, preserves stereo, includes limiter/FX/faders and mutes');
  const pcm=new Float32Array(48000*4*2);
  for(let f=0;f<48000*4;f++){pcm[f*2]=.2*Math.sin(2*Math.PI*220*f/48000);pcm[f*2+1]=.15*Math.sin(2*Math.PI*330*f/48000);}
  await page.locator('#music-rights').check();
  await page.locator('#file-a').setInputFiles({name:'original-test-tone.wav',mimeType:'audio/wav',buffer:Buffer.from(stereoWav(pcm,48000*4,48000))});
  await page.waitForFunction(()=>!document.getElementById('play-a').disabled);
  await page.locator('#loop-a').click(); await page.locator('#play-a').click();
  await page.waitForFunction(()=>document.getElementById('state-a').textContent==='Playing');
  await page.locator('#load-instruments').click();
  await page.waitForFunction(()=>document.getElementById('load-instruments').textContent==='Instruments ready');
  await page.locator('#mix-record-consent').check(); await page.locator('#mix-record-start').click();
  const recording=()=>page.waitForFunction(()=>!document.getElementById('mix-record-stop').disabled);
  await recording();
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a'); await page.waitForTimeout(250); await page.keyboard.up('a');
  await page.locator('#master').fill('0'); await page.locator('#master').dispatchEvent('input');
  await page.waitForTimeout(300); await page.locator('#mix-record-stop').click();
  await page.locator('#mix-record-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#state-a').textContent(),'Playing');
  for(const [id,name] of [['mix-record-wav','mix.wav'],['mix-record-json','mix.json']]) {
    const promise=page.waitForEvent('download'); await page.locator(`#${id}`).click();
    await(await promise).saveAs(path.join(output,name));
  }
  const receipt=validateMixRecording(JSON.parse(await fs.readFile(path.join(output,'mix.json'),'utf8')));
  const wav=await fs.readFile(path.join(output,'mix.wav')); assert.equal(await sha256(wav),receipt.wav_sha256);
  assert.equal(wav.length,44+receipt.frames*4); assert.equal(receipt.training_authorized,false);
  let peak=0,tail=0;
  for(let i=44;i<wav.length;i+=2){const v=Math.abs(wav.readInt16LE(i))/32768;peak=Math.max(peak,v);if(i>wav.length-receipt.sample_rate*.05*4)tail=Math.max(tail,v);}
  assert.ok(peak>.01 && peak<1); assert.equal(tail,0);
  await page.locator('#pause-all').click();
  await page.locator('#mix-record-player').evaluate(a=>a.play());
  await page.waitForFunction(()=>document.getElementById('mix-record-player').currentTime>0);
  await page.locator('#mix-record-player').evaluate(a=>a.pause());
  checks.push('consented deck + live instruments produce playable hash-bound WAV; master mute captured; stop leaves deck playing');
  for(const [width,height,name] of [[1440,1000,'desktop.png'],[390,844,'mobile.png']]) {
    await page.setViewportSize({width,height}); await page.locator('#mix-recording').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    takingScreenshot=true; try{await page.screenshot({path:path.join(output,name)});}finally{takingScreenshot=false;}
  }
  checks.push('desktop/mobile controls render without horizontal overflow');
  await page.locator('#music-rights').uncheck();
  assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  assert.equal(await page.locator('#mix-record-player').getAttribute('src'),null);
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>{
    const digest=crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest=async(...args)=>{await new Promise(resolve=>window.releaseMixHash=resolve);crypto.subtle.digest=digest;return digest(...args);};
  });
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.waitForFunction(()=>typeof releaseMixHash==='function');
  await page.locator('#mix-record-consent').uncheck(); await page.evaluate(()=>releaseMixHash());
  await page.waitForTimeout(150); assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  await page.locator('#mix-record-consent').check(); await page.locator('#mix-record-start').click(); await recording();
  await page.locator('#phrase-consent').check();
  await page.locator('#phrase-file').setInputFiles(path.join(root,'renders/fixtures/synthetic-speech.wav'));
  await page.waitForFunction(()=>document.getElementById('mix-record-status').textContent.includes('Source phrase changed'));
  assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  await page.locator('#mix-record-start').click(); await recording();
  await page.locator('#phrase-consent').uncheck();
  assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  checks.push('music/voice/capture withdrawal and source replacement discard captures; delayed hashes cannot restore exports');
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.match(await page.locator('#mix-record-status').textContent(),/interrupted/);
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>mixNode.context.suspend());
  await page.waitForFunction(()=>document.getElementById('mix-record-status').textContent.includes('interrupted'));
  await page.locator('#mix-record-start').click(); await recording();
  await page.locator('#master').fill('0.7'); await page.locator('#master').dispatchEvent('input');
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await page.evaluate(()=>mixNode.dispatchEvent(new Event('processorerror')));
  assert.match(await page.locator('#mix-record-status').textContent(),/Recorder failed/);
  await page.waitForFunction(()=>document.getElementById('output-meter').value>.001);
  await page.keyboard.up('a');
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>{
    window.mixCancelled=false;
    const close=mixNode.port.close.bind(mixNode.port);
    // An active take closes this port only after its cancellation acknowledgement.
    mixNode.port.close=()=>{window.mixCancelled=true;close();};
  });
  await page.locator('#mix-record-delete').click();
  await page.waitForFunction(()=>mixCancelled);
  assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  checks.push('focus loss, audio suspension and recorder failure discard unfinished capture; instruments keep sounding, retry/delete work');
  await page.locator('#mix-record-start').click(); await recording();
  await page.locator('#mix-record-wav').waitFor({state:'visible',timeout:35000});
  const autoDownload=page.waitForEvent('download'); await page.locator('#mix-record-json').click();
  await(await autoDownload).saveAs(path.join(output,'automatic-stop.json'));
  const automatic=validateMixRecording(JSON.parse(await fs.readFile(path.join(output,'automatic-stop.json'),'utf8')));
  assert.ok(automatic.frames<=automatic.sample_rate*30 && automatic.frames>0);
  await page.locator('#mix-record-delete').click();
  checks.push('real 30-second UI timer stops automatically within the audio buffer cap');
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',browser:kind,version:browser.version(),url,
    viewports:[[1440,1000],[390,844]],checks,reference,receipt,automatic,peak,tail,errors,external,warnings,
    physicalDevices:'NOT RUN',humanQuality:'NOT RUN',training:'NOT RUN',liveMixReplay:'NOT RUN: no complete automation/source trace'},null,2));
  console.log(JSON.stringify({status:'PASS',output,checks}));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
