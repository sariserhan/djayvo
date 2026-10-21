import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { stereoWav, sha256 } from '../live-take.js';
import { validateMixSources } from '../mix-sources.js';
import { validateMixAutomation } from '../mix-automation.js';
import { validateMixRecording } from '../mix-recording.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.JAMLOOM_BROWSER || 'chromium'; assert.ok(['chromium','webkit'].includes(kind));
const output = await fs.mkdtemp(path.join(root, `renders/mix-recording-${kind}-`));
console.log('Artifacts:', output);
const publicRoot = path.join(root, 'dist/web'), errors = [], external = [], checks = [], warnings = [];
let takingScreenshot = false;
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://local').pathname.slice(1);
  if(name==='api/aurowall'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({tracks:[]}));return;}
 if(name==='api/site-status'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({banner:null}));return;}
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
  page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (takingScreenshot && kind === 'webkit' && m.text().startsWith('Refused to apply a stylesheet')) warnings.push(m.text());
    else errors.push(m.text());
  });
  page.on('request', r => { if (!r.url().startsWith(url.replace('/dj.html','/')) && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.goto(url);
  for (const deck of ['a','b']) await page.locator(`.deck-${deck} .deck-fx-panel summary`).click();
  assert.equal(await page.title(), 'Jamloom — DJ workspace');
  assert.equal(await page.locator('#mix-record-start').isDisabled(), true);
  const reference = await page.evaluate(async () => {
    const { createMixer, updateToneEcho, clearEcho } = await import('./mixer.js');
    const { MixAutomation } = await import('./mix-automation.js');
    const { stereoWav, sha256 } = await import('./live-take.js');
    const context = new OfflineAudioContext(2, 48000, 48000), mixer = createMixer(context);
    const trace = new MixAutomation(mixer, context); mixer.automationTrace = trace;
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
    const stop=context.suspend(.75).then(()=>{routes.forEach(route=>clearEcho(context,route.fx));node.port.postMessage({type:'stop'});return context.resume();});
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
    const capturedHash=await sha256(wav);
    const effectTrace=trace.finish({wav_sha256:capturedHash,sample_rate:data.rate,observed_context_start_frame:data.first});
    const bytes=new Uint8Array(wav); let binary=''; for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    return {maximum,rms:Math.sqrt(square/(data.frames*2)),frames:data.frames,first:data.first,
      timestampDiscontinuities:data.discontinuities,peak,tail,stereoDifference,
      capturedHash,effectTrace,referenceHash:await sha256(reference),wav:btoa(binary)};
  });
  assert.equal(reference.maximum,0); assert.equal(reference.rms,0); assert.equal(reference.first,256);
  assert.equal(reference.capturedHash,reference.referenceHash);
  validateMixAutomation(reference.effectTrace,{wav_sha256:reference.capturedHash,sample_rate:48000,observed_context_start_frame:reference.first});
  for(const target of ['a','b','c','rack']) {
    assert.ok(reference.effectTrace.events.some(e=>e.kind==='tone_echo' && e.target===target && e.echo===.3));
    assert.ok(reference.effectTrace.events.some(e=>e.kind==='clear_echo' && e.target===target && e.spacing_ms===100));
  }
  checks.push('actual A/B/C/rack effect schedules and echo buffer resets captured in versioned WAV-linked trace');
  assert.ok(reference.frames+reference.first>=36000 && reference.frames+reference.first<=48000);
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
  const bWav=Buffer.from(stereoWav(pcm.slice(0,48000*2),48000,48000));
  await page.locator('#file-b').setInputFiles({name:'temporary-source.wav',mimeType:'audio/wav',buffer:bWav});
  await page.waitForFunction(()=>!document.getElementById('play-b').disabled);
  await page.locator('#clear-b').click();
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a'); await page.waitForTimeout(250); await page.keyboard.up('a');
  for (const [id,value] of [['eq-a-0','-6'],['c-level','0.3'],['rack-level','0.5']]) {
    await page.locator(`#${id}`).fill(value); await page.locator(`#${id}`).dispatchEvent('input');
  }
  for (const [id,value] of [['tone-a','50'],['echo-a','0.25'],['delay-a','170'],['rack-echo','0.3']]) {
    await page.locator(`#${id}`).fill(value); await page.locator(`#${id}`).dispatchEvent('input');
  }
  await page.locator('#fx-reset-a').click(); await page.locator('#rack-fx-reset').click();
  await page.locator('#master').fill('0'); await page.locator('#master').dispatchEvent('input');
  await page.waitForTimeout(300); await page.locator('#mix-record-stop').click();
  await page.locator('#mix-record-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#state-a').textContent(),'Playing');
  for(const [id,name] of [['mix-record-wav','mix.wav'],['mix-record-json','mix.json'],['mix-record-automation','controls.json'],['mix-record-sources','sources.json']]) {
    const promise=page.waitForEvent('download'); await page.locator(`#${id}`).click();
    await(await promise).saveAs(path.join(output,name));
  }
  const receipt=validateMixRecording(JSON.parse(await fs.readFile(path.join(output,'mix.json'),'utf8')));
  const wav=await fs.readFile(path.join(output,'mix.wav')); assert.equal(await sha256(wav),receipt.wav_sha256);
  assert.equal(wav.length,44+receipt.frames*4); assert.equal(receipt.training_authorized,false);
  const sources=validateMixSources(JSON.parse(await fs.readFile(path.join(output,'sources.json'),'utf8')),receipt);
  const aHash=await sha256(stereoWav(pcm,48000*4,48000)), bHash=await sha256(bWav);
  assert.ok(sources.assets.some(a=>a.kind==='local_audio' && a.sha256===aHash));
  const bIndex=sources.assets.findIndex(a=>a.kind==='local_audio' && a.sha256===bHash);
  assert.ok(bIndex>=0 && sources.snapshots.some(snapshot=>snapshot.b===bIndex));
  assert.equal(sources.snapshots.at(-1).b,null);
  const engine=await fs.readFile(path.join(publicRoot,'engine/jamloom_live.wasm')), awaitedEngineHash=await sha256(engine);
  assert.ok(sources.assets.some(a=>a.kind==='instrument_engine' && a.sha256===awaitedEngineHash && a.bytes===engine.length));
  assert.equal(sources.rights_verified,false); assert.equal(sources.training_authorized,false);
  assert.ok(!JSON.stringify(sources).includes('temporary-source.wav'));
  checks.push('source inventory hashes exact A/B files and loaded bank, retains mid-recording unload history without filenames or inferred rights');
  const automation=validateMixAutomation(JSON.parse(await fs.readFile(path.join(output,'controls.json'),'utf8')),receipt);
  for (const [target,value] of [['eq-a-0',-6],['c',.3*.75*.8],['rack',.5*.75]])
    assert.ok(automation.events.some(e=>e.target===target && e.value===value));
  assert.equal(automation.schema_version,'3.0-mix-automation');
  for (const target of ['a','rack']) {
    assert.ok(automation.events.some(e=>e.kind==='tone_echo' && e.target===target && e.echo>0));
    assert.ok(automation.events.some(e=>e.kind==='clear_echo' && e.target===target));
  }
  const mute=automation.events.filter(e=>e.target==='a' && e.value===0).at(-1);
  assert.ok(mute);
  const muteFrame=mute.context_frame-receipt.observed_context_start_frame;
  assert.ok(muteFrame>=0 && muteFrame+Math.ceil(receipt.sample_rate*.1)<receipt.frames);
  for(let f=muteFrame+Math.ceil(receipt.sample_rate*.1);f<receipt.frames;f++)
    assert.equal(wav.readInt16LE(44+f*4),0);
  checks.push('scheduled gain/EQ targets link to WAV clock and hash; master mute reaches zero PCM after smoothing');
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
  await page.locator('#mix-record-delete').click();
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>{
    const original=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=async function(){await new Promise(resolve=>window.releaseSourceRead=resolve);File.prototype.arrayBuffer=original;return original.call(this);};
  });
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.waitForFunction(()=>typeof releaseSourceRead==='function');
  assert.equal(await page.locator('#mix-record-wav').isVisible(),true);
  await page.locator('#mix-record-consent').uncheck(); await page.evaluate(()=>releaseSourceRead());
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#mix-record-sources').getAttribute('href'),null);
  assert.equal(await page.locator('#mix-record-wav').getAttribute('href'),null);
  await page.locator('#mix-record-consent').check();
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>{
    const original=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=async function(){File.prototype.arrayBuffer=original;throw new Error('Injected source read failure');};
  });
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.waitForFunction(()=>document.getElementById('mix-record-status').textContent.includes('Source details unavailable'));
  assert.equal(await page.locator('#mix-record-wav').isVisible(),true);
  assert.equal(await page.locator('#mix-record-automation').isVisible(),true);
  assert.equal(await page.locator('#mix-record-sources').isVisible(),false);
  await page.locator('#mix-record-delete').click();
  await page.locator('#mix-record-start').click(); await recording();
  await page.evaluate(()=>{
    const original=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=async function(){await new Promise(resolve=>window.releaseTimedSource=resolve);File.prototype.arrayBuffer=original;return original.call(this);};
  });
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.waitForFunction(()=>document.getElementById('mix-record-status').textContent.includes('Source details unavailable'),null,{timeout:15000});
  assert.equal(await page.locator('#mix-record-wav').isVisible(),true);
  await page.evaluate(()=>releaseTimedSource()); await page.waitForTimeout(150);
  assert.equal(await page.locator('#mix-record-sources').getAttribute('href'),null);
  checks.push('delayed source hashing cannot restore revoked exports; read failure and real 10-second deadline preserve WAV and controls');
  await page.locator('#music-rights').uncheck();
  assert.equal(await page.locator('#mix-record-wav').isVisible(),false);
  assert.equal(await page.locator('#mix-record-player').getAttribute('src'),null);
  assert.equal(await page.locator('#mix-record-sources').getAttribute('href'),null);
  assert.equal(await page.locator('#mix-record-automation').getAttribute('href'),null);
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
  assert.equal(await page.locator('#mix-record-automation').getAttribute('href'),null);
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
  await page.evaluate(()=>{
    const control=document.getElementById('master');
    for(let i=0;i<1100;i++) control.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.locator('#mix-record-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#mix-record-automation').getAttribute('href'),null);
  assert.match(await page.locator('#mix-record-status').textContent(),/trace exceeded its limit/);
  await page.locator('#mix-record-delete').click();
  checks.push('automation overflow discards only control trace, keeps WAV and reports the limit');
  await page.locator('#mix-record-start').click(); await recording();
  const failure=await page.evaluate(()=>{
    const original=AudioParam.prototype.setTargetAtTime; let calls=0;
    AudioParam.prototype.setTargetAtTime=function(...args){if(++calls===2)throw new Error('Injected partial FX failure');return original.apply(this,args);};
    try { document.getElementById('rack-echo').oninput(); return 'missing failure'; }
    catch(error) { return error.message; }
    finally { AudioParam.prototype.setTargetAtTime=original; }
  });
  assert.equal(failure,'Injected partial FX failure');
  await page.waitForTimeout(150); await page.locator('#mix-record-stop').click();
  await page.locator('#mix-record-wav').waitFor({state:'visible'});
  assert.equal(await page.locator('#mix-record-automation').getAttribute('href'),null);
  assert.match(await page.locator('#mix-record-status').textContent(),/trace was incomplete/);
  await page.locator('#mix-record-delete').click();
  checks.push('partial AudioParam effect failure discards incomplete trace, keeps validated WAV, permits retry');
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
    viewports:[[1440,1000],[390,844]],checks,reference,receipt,automation,sources,muteFrame,automatic,peak,tail,errors,external,warnings,
    physicalDevices:'NOT RUN',humanQuality:'NOT RUN',training:'NOT RUN',liveMixReplay:'NOT RUN: no complete automation/source trace'},null,2));
  console.log(JSON.stringify({status:'PASS',output,checks}));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
