import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
const [wasmPath, nativePath, linuxPath, output] = process.argv.slice(2);
assert.ok(output, 'Usage: node scripts/verify_live_instruments.mjs WASM MAC_PCM LINUX_PCM NEW_OUTPUT_DIR');
fs.mkdirSync(output); // Refuse to replace any prior recordings/evidence.
const module = await WebAssembly.compile(fs.readFileSync(wasmPath));
assert.deepEqual(WebAssembly.Module.imports(module), []);
const engine = (await WebAssembly.instantiate(module, {})).exports;
engine._initialize();
const buffer = new Float32Array(engine.memory.buffer, engine.djayvo_live_buffer(), 4096);
assert.equal(engine.djayvo_live_init(48000), 1);
for (let pitch = 21; pitch <= 108; pitch++) {
  engine.djayvo_live_init(48000); assert.equal(engine.djayvo_live_note(1, 0, pitch, 100), 1);
  let energy = 0;
  for (let block = 0; block < 32; block++) { engine.djayvo_live_render(128); for (let i = 0; i < 256; i++) energy += Math.abs(buffer[i]); }
  assert.ok(energy > .001, `Silent key ${pitch}`);
}
const pcm = new Float32Array(13 * 750 * 256), events = [];
let offset = 0;
for (let patch = 0; patch < 13; patch++) {
  engine.djayvo_live_init(48000);
  events.push({ patch, noteOnFrame: 0, noteOffFrame: 23936, mouthFrame: patch === 11 ? 12800 : null, totalFrames: 96000 });
  for (let block = 0; block < 750; block++) {
    if (!block) assert.equal(engine.djayvo_live_note(1, patch, patch == 12 ? 39 : patch >= 9 ? 36 : 60, 100), 1);
    if (patch === 11 && block === 100) assert.equal(engine.djayvo_live_mouth(1), 1);
    if (block === 187) engine.djayvo_live_off(1);
    engine.djayvo_live_render(128); pcm.set(buffer.subarray(0, 256), offset); offset += 256;
  }
}
const comparisons = [];
for (const [platform, filename] of [['macOS', nativePath], ['Linux', linuxPath]]) {
  const bytes = fs.readFileSync(filename), reference = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  assert.equal(reference.length, pcm.length);
  for (let patch = 0; patch < 13; patch++) {
    let max = 0, sum = 0, peak = 0;
    for (let i = patch * 192000; i < (patch + 1) * 192000; i++) {
      assert.ok(Number.isFinite(pcm[i]) && Number.isFinite(reference[i]));
      const delta = pcm[i] - reference[i]; max = Math.max(max, Math.abs(delta)); sum += delta * delta; peak = Math.max(peak, Math.abs(pcm[i]));
    }
    const rms = Math.sqrt(sum / 192000); assert.ok(rms < 1e-5 && max < .001 && peak <= .8, `${platform} patch ${patch} mismatch`);
    comparisons.push({ platform, patch, maxAbsoluteDifference: max, rmsDifference: rms, peak });
  }
}
engine.djayvo_live_init(48000);
const noteTimes = [];
for (let id = 1; id <= 32; id++) { const start = performance.now(); assert.equal(engine.djayvo_live_note(id, 6, 40 + id, 100), 1); noteTimes.push(performance.now() - start); }
assert.equal(engine.djayvo_live_note(33, 6, 60, 100), 0);
const times = [];
for (let i = 0; i < 4000; i++) { const start = performance.now(); engine.djayvo_live_render(128); if (i >= 100) times.push(performance.now() - start); }
times.sort((a,b) => a-b);
function writeWav(name, samples) {
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(192000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
for (let i = 0; i < samples.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
fs.writeFileSync(path.join(output, name), wav);
}
writeWav('instrument-palette.wav', pcm);
const report = { status: 'PASS', notes: 88, patches: 13, channels: 2, sampleRate: 48000, seconds: 26, events,
  frameAgreement: 'PASS: identical explicit frame-zero note-on and frame-23936 note-off program, mouth change at frame 12800 for patch 11, 96000 frames per patch in native and WASM', comparisons,
  wasm32VoiceTiming: { blockFrames: 128, blockBudgetMs: 128 / 48, measuredBlocks: times.length, p50Ms: times[Math.floor(times.length * .5)], p95Ms: times[Math.floor(times.length * .95)], p99Ms: times[Math.floor(times.length * .99)], maxMs: times.at(-1), maxNoteOnMs: Math.max(...noteTimes), limitation: 'Node WASM compute only; not device, browser scheduling or end-to-end latency' },
  humanListening: 'NOT RUN', hardwareLatency: 'NOT RUN' };

const demos = [];
function demo(name, frames, events) {
  engine.djayvo_live_init(48000); events.sort((a,b) => a.frame-b.frame);
  const samples = new Float32Array(frames*2); let cursor=0, next=0;
  while(cursor<frames) {
    while(next<events.length && events[next].frame===cursor) {
      const event=events[next++];
      if(event.type==='on') assert.equal(engine.djayvo_live_note(event.id,event.patch,event.pitch,event.velocity),1);
      else if(event.type==='off') engine.djayvo_live_off(event.id);
      else assert.equal(engine.djayvo_live_mouth(event.value),1);
    }
    const count=Math.min(128,frames-cursor,next<events.length?events[next].frame-cursor:128);
    assert.ok(count>0);engine.djayvo_live_render(count);samples.set(buffer.subarray(0,count*2),cursor*2);cursor+=count;
  }
  let peak=0,square=0,step=0;
  for(let i=0;i<samples.length;i++){assert.ok(Number.isFinite(samples[i]));peak=Math.max(peak,Math.abs(samples[i]));square+=samples[i]**2;if(i>=2)step=Math.max(step,Math.abs(samples[i]-samples[i-2]));}
  assert.ok(peak>.001 && peak<=.8);writeWav(name,samples);
  demos.push({name,frames,peak,rms:Math.sqrt(square/samples.length),maximumStep:step,events});
}
demo('talk-bass-vowels.wav',288000,[
 {frame:0,type:'on',id:1,patch:11,pitch:36,velocity:100},
 {frame:48000,type:'mouth',value:.5},{frame:96000,type:'mouth',value:1},{frame:144000,type:'mouth',value:0},
 {frame:192000,type:'off',id:1}]);
const hits=[];
for(const [i,pitch] of [39,37,41,70].entries()){hits.push({frame:i*48000,type:'on',id:i+1,patch:12,pitch,velocity:110});}
demo('new-percussion.wav',240000,hits);
const jam=[];let id=1;
function note(frame,patch,pitch,velocity,duration){const identifier=id++;jam.push({frame,type:'on',id:identifier,patch,pitch,velocity},{frame:frame+duration,type:'off',id:identifier});}
for(let beat=0;beat<16;beat++){
 const frame=beat*28800;note(frame,9,36,beat%4===0?110:90,9000);
 if(beat%2===1){note(frame,9,38,105,9000);note(frame,12,39,75,9000);}
 note(frame,10,42,75,4000);note(frame+14400,12,70,65,4000);
 note(frame+7200,11,[36,39,43,41][Math.floor(beat/4)],100,12000);
 jam.push({frame:frame+7200,type:'mouth',value:(beat%3)/2});
 if(beat%4===0)for(const pitch of [60,63,67])note(frame,1,pitch,72,22000);
 if(beat===15)note(frame+21600,12,41,100,6000);
}
demo('studio-jam.wav',576000,jam);
engine.djayvo_live_init(48000);
for(let id=1;id<=32;id++)assert.equal(engine.djayvo_live_note(id,11,24+id,100),1);
const talkTimes=[];
for(let i=0;i<1100;i++){if(i%100===0)engine.djayvo_live_mouth((i%300)/200);const start=performance.now();engine.djayvo_live_render(128);if(i>=100)talkTimes.push(performance.now()-start);}
talkTimes.sort((a,b)=>a-b);
report.talk32VoiceTiming={p99Ms:talkTimes[990],maxMs:talkTimes.at(-1),blockBudgetMs:128/48,limitation:'Node compute only; not hardware/browser latency'};
report.demos=demos;
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({demos:demos.map(d=>({name:d.name,peak:d.peak})),talkTiming:report.talk32VoiceTiming},null,2));
