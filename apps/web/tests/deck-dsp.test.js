import test from 'node:test';
import assert from 'node:assert/strict';
import { DeckDSP } from '../deck-dsp.js';
const sr=48000;
const tone=(hz=440)=>Float32Array.from({length:sr*4},(_,i)=>.4*Math.sin(2*Math.PI*hz*i/sr));
function render(dsp, frames=sr){const result=new Float32Array(frames),block=[new Float32Array(128),new Float32Array(128)];for(let i=0;i<frames;i+=128){dsp.process(block);result.set(block[0].subarray(0,Math.min(128,frames-i)),i);for(let j=0;j<128;j++)assert.equal(block[1][j],block[0][j]);}return result;}
function pitch(samples){let crossings=0;for(let i=4097;i<samples.length;i++)if(samples[i-1]<=0&&samples[i]>0)crossings++;return crossings*sr/(samples.length-4096);}
test('key lock retains a tone pitch while transport advances at selected speed',()=>{
 for(const hz of [55,110,220,440,880,2000])for(const speed of [.84,.92,1.08,1.16]){
  const dsp=new DeckDSP([tone(hz)],sr);dsp.speed=speed;dsp.keylock=true;dsp.playing=true;
  const pcm=render(dsp);assert.ok(Math.abs(pitch(pcm)-hz)<3,`${speed}: ${pitch(pcm)}`);
  assert.ok(Math.abs(dsp.position-Math.ceil(sr/128)*128*speed)<1e-5);
  assert.ok(pcm.every(x=>Number.isFinite(x)&&Math.abs(x)<=.401));
  let maxJump=0;for(let i=1;i<pcm.length;i++)maxJump=Math.max(maxJump,Math.abs(pcm[i]-pcm[i-1]));assert.ok(maxJump<Math.min(.2,hz/20000+.04),`jump ${maxJump}`);
 }
 const dsp=new DeckDSP([tone()],sr);dsp.speed=1.16;dsp.playing=true;assert.ok(Math.abs(pitch(render(dsp))-510.4)<3);
});
test('scratch reads PCM backwards, halts when movement stops and resumes without crossing bounds',()=>{
 const pcm=Float32Array.from({length:sr},(_,i)=>i/sr),dsp=new DeckDSP([pcm],sr);dsp.seek(2000);dsp.playing=true;dsp.scratch=true;dsp.scratchSpeed=-1;dsp.scratchFrames=400;
 const out=render(dsp,384);assert.ok(Math.abs(out[350]-(2000-350)/sr)<1e-7);assert.equal(dsp.position,1616);
 render(dsp,512);assert.equal(dsp.scratchSpeed,0);assert.equal(dsp.position,1601);
 dsp.seek(0);dsp.scratchSpeed=-4;render(dsp,128);assert.equal(dsp.position,0);
 dsp.scratch=false;dsp.seek(sr-100);render(dsp,512);assert.equal(dsp.playing,false);assert.equal(dsp.position,sr);
});
test('loops retain the declared timeline and transport remains finite at edges',()=>{
 const dsp=new DeckDSP([tone()],sr);dsp.loop=true;dsp.loopStart=sr;dsp.loopEnd=sr+512;dsp.seek(sr);dsp.playing=true;dsp.keylock=true;dsp.speed=1.16;
 for(let i=0;i<100;i++){const out=render(dsp,128);assert.ok(out.every(Number.isFinite));assert.ok(dsp.position>=sr&&dsp.position<sr+512);}
 dsp.playing=false;assert.ok(render(dsp,1024).slice(-128).every(x=>x===0));
 assert.throws(()=>new DeckDSP([new Float32Array(0)],sr));assert.throws(()=>new DeckDSP([tone(),new Float32Array(3)],sr));
});
