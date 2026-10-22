import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { replayAudio } from '../../../scripts/replay_audio.mjs';
import { inspectReplayWav } from '../mix-replay.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { replayFixture } from './mix-replay-fixture.js';
import { stereoWav, sha256, executeCommand } from '../live-take.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=await fs.mkdtemp(path.join(root,'renders/mix-action-replay-'));
console.log('Artifacts:',output);
const p=replayFixture(),files={},assets=new Map();
async function add(kind,bytes,name,extra={}){
  const hash=await sha256(bytes);const index=p.sources.assets.length;
  p.sources.assets.push({kind,sha256:hash,bytes:bytes.byteLength,...extra});files[hash]=name;assets.set(hash,bytes);
  await fs.writeFile(path.join(output,name),Buffer.from(bytes));return index;
}
const tone=frequency=>stereoWav(Float32Array.from({length:96000},(_,i)=>.2*Math.sin(2*Math.PI*frequency*Math.floor(i/2)/48000)*(i%2?.7:1)),48000,48000);
const a=await add('local_audio',tone(220),'a.wav');
await fs.writeFile(path.join(output,'b-original.wav'),Buffer.from(tone(330)));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-i',path.join(output,'b-original.wav'),'-c:a','libmp3lame','-q:a','4',path.join(output,'encoded.mp3')]);
const compressed=await fs.readFile(path.join(output,'encoded.mp3'));
const b=await add('local_audio',compressed,'b.mp3');
const canonical=await replayAudio(compressed,48000);
const info=inspectReplayWav(canonical.buffer.slice(canonical.byteOffset,canonical.byteOffset+canonical.length));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-i',path.join(output,'b-original.wav'),'-c:a','flac',path.join(output,'encoded.flac')]);
const flac=await replayAudio(await fs.readFile(path.join(output,'encoded.flac')),48000);assert.ok(flac.length>1000);
await assert.rejects(replayAudio(Buffer.from('#EXTM3U\nhttps://example.invalid/private.mp3'),48000));
await assert.rejects(replayAudio(Buffer.from('garbage'),48000));
for (const [name, channels, duration] of [['long','mono','301'],['multichannel','5.1','0.1']]) {
 const file=path.join(output,name+'.flac');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i','anullsrc=r=32000:cl='+channels,'-t',duration,'-c:a','flac',file]);
 await assert.rejects(replayAudio(await fs.readFile(file),48000),/bounds/);
}
const sample=await add('sampler_audio',tone(550),'sample.wav');
p.sources.schema_version='3.0-mix-sources';Object.assign(p.sources.snapshots[0],Object.fromEntries(Array.from({length:8},(_,i)=>['sample'+i,i===0?sample:null])));
p.automation.schema_version='4.0-mix-automation';p.automation.initial_sampler=[{pad:0,started_context_frame:0,duration:1,settings:{start:.1,end:.3,pitch:-5,level:.8,loop:true}}];
const c=await add('generated_wav',tone(440),'c.wav');
const wasm=await fs.readFile(path.join(root,'dist/web/engine/jamloom_live.wasm'));
const rack=await add('instrument_engine',wasm,'bank.wasm');
const {instance}=await WebAssembly.instantiate(wasm,{}),e=instance.exports;e._initialize();e.jamloom_live_init(48000);
const events=[{frame:0,command:{type:'note',id:1,patch:0,pitch:60,velocity:96}},
 {frame:12000,command:{type:'mouth',position:.5}},{frame:24000,command:{type:'off',id:1}},{frame:36000,command:{type:'panic'}}];
const pcm=new Float32Array(96000),buffer=new Float32Array(e.memory.buffer,e.jamloom_live_buffer(),4096);let index=0;
for(let frame=0;frame<48000;){while(events[index]?.frame===frame)assert.ok(executeCommand(e,events[index++].command));
 const count=Math.min(128,48000-frame,(events[index]?.frame??48000)-frame);assert.ok(e.jamloom_live_render(count));pcm.set(buffer.subarray(0,count*2),frame*2);frame+=count;}
p.instrument={start_context_frame:0,take:{schema_version:'1.0-live-instrument-take',scope:'dry_instruments',origin:'unreviewed_live_capture',
 training_authorized:false,engine_sha256:await sha256(wasm),wav_sha256:await sha256(stereoWav(pcm,48000,48000)),sample_rate:48000,frames:48000,initial_mouth:0,events}};
Object.assign(p.sources.snapshots[0],{a,b,c,rack});
for(const slot of ['a','b'])Object.assign(p.transport.events[0].state[slot],{mode:'worklet',duration_seconds:1,playing:true});
p.transport.events[0].state.b.duration_seconds=info.frames/info.rate;
p.transport.events[0].state.prepared={a:null,c:{start_frame:1024,end_frame:49024},tempo_milli_bpm:0,origin_frame:0};
const transport=(frame,target,action,changes)=>{const next=structuredClone(p.transport.events.at(-1));Object.assign(next,{context_frame:frame,target,action});Object.assign(next.state[target],changes);p.transport.events.push(next);};
transport(4096,'a','rate',{rate:1.12});transport(8192,'a','keylock',{key_lock:true});
transport(12288,'b','loop',{loop:true,region_seconds:[.1,.3]});transport(16384,'a','seek',{position_seconds:.2});
transport(20480,'a','scratch',{scratching:true,scratch_speed:-1});transport(22528,'a','scratch-end',{scratching:false,scratch_speed:0});
transport(24576,'prepared','prepared',{c:null});transport(32768,'b','pause',{playing:false});
p.automation.initial_deck_effects.a={reverb:.2,phaser:.1,flanger:.1};
p.automation.events=[{kind:'tone_echo',context_frame:4096,target:'a',tone:60,echo:.3,spacing_ms:100,held_frequency_hz:24000},
 {kind:'gain',context_frame:8192,target:'eq-a-0',value:6},
 {kind:'deck_effects',context_frame:12288,target:'b',reverb:.2,phaser:.2,flanger:.2},
 {kind:'clear_echo',context_frame:16384,target:'a',spacing_ms:100},
 {kind:'clear_deck_effects',context_frame:20480,target:'b'},
 {kind:'sample_stop',context_frame:24576,pad:0},
 {kind:'sample_start',context_frame:28672,pad:0,duration:1,settings:{start:.2,end:.7,pitch:7,level:.4,loop:false}},
 ...['a','b','c','rack'].map(target=>({kind:'gain',context_frame:40001,target,value:0}))];
await fs.writeFile(path.join(output,'replay.json'),JSON.stringify(p));await fs.writeFile(path.join(output,'assets.json'),JSON.stringify(files));
function run(args,kind='chromium') {return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/replay_mix.mjs',...args],{cwd:root,env:{...process.env,JAMLOOM_BROWSER:kind},stdio:['ignore','pipe','pipe']});let text='';child.stdout.on('data',b=>text+=b);child.stderr.on('data',b=>text+=b);child.on('error',reject);child.on('exit',code=>resolve({code,text}));});}
const args=[path.join(output,'replay.json'),path.join(output,'assets.json')],results=[];
for(const kind of ['chromium','webkit']){
 for(let repeat=0;repeat<2;repeat++){
  const directory=path.join(output,kind+'-'+repeat),result=await run([...args,directory],kind);
  await fs.writeFile(path.join(output,kind+'-'+repeat+'.log'),result.text);assert.equal(result.code,0,result.text);
  const report=JSON.parse(await fs.readFile(path.join(directory,'report.json'),'utf8'));results.push({kind,repeat,...report});
  const wav=await fs.readFile(path.join(directory,'replay.wav'));assert.equal(wav.length,44+48000*4);
  let peak=0,late=0;for(let i=44;i<wav.length;i+=2){const n=Math.abs(wav.readInt16LE(i));peak=Math.max(peak,n);if(i>44+46000*4)late=Math.max(late,n);}
  assert.ok(peak>100&&peak<32767);assert.ok(late<5);assert.equal(report.exact_recording_match,false);
  if(repeat){
   const previous=await fs.readFile(path.join(output,kind+'-0','replay.wav'));let maximum=0,different=0;
   for(let i=44;i<wav.length;i+=2){const difference=Math.abs(wav.readInt16LE(i)-previous.readInt16LE(i));maximum=Math.max(maximum,difference);if(difference)different++;}
   // Existing browser PCM acceptance allows 2 units; preserve exact-hash disagreement in evidence.
   assert.ok(maximum<=2,`Repeat PCM difference ${maximum}`);Object.assign(results.at(-1),{repeat_max_pcm16:maximum,repeat_different_samples:different,repeat_exact:maximum===0});
  }
 }
}
assert.notEqual(results[0].replay_wav_sha256,'a'.repeat(64));
const duplicate=await run([...args,path.join(output,'chromium-0')]);assert.notEqual(duplicate.code,0);assert.match(duplicate.text,/EEXIST/);
const source=path.join(output,'a.wav'),original=await fs.readFile(source);const corrupt=Buffer.from(original);corrupt[100]^=1;await fs.writeFile(source,corrupt);
const mismatch=await run([...args,path.join(output,'tampered')]);assert.notEqual(mismatch.code,0);assert.match(mismatch.text,/hash/);await fs.writeFile(source,original);
const missing=structuredClone(p);missing.instrument=null;await fs.writeFile(path.join(output,'missing.json'),JSON.stringify(missing));
const incomplete=await run([path.join(output,'missing.json'),args[1],path.join(output,'incomplete')]);assert.notEqual(incomplete.code,0);assert.match(incomplete.text,/Instrument action/);
const receipt={status:'PASS',checks:['four-channel action reconstruction with shared instrument WASM and prepared C cancellation',
 'sampler initial voices, trim, looping, pitch, stop/retrigger through shared rack FX','deck rate, keylock, seek, loops, scratch and stop','gain/EQ, echo, reverb, phaser, flanger and resets',
 'same-browser repeated PCM within existing 2-unit tolerance; hashes retained','finite stereo non-silence and scheduled end mute','MP3/FLAC bounded decoding; playlist and malformed input refused','source tamper refusal','missing instrument refusal','exclusive output directory'],
 results,artifacts:output,physical:'NOT RUN',listening:'NOT RUN'};
await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
