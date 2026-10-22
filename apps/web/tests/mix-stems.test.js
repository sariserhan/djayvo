import test from 'node:test';
import assert from 'node:assert/strict';
import { stemWav, validateMixStems, MIX_STEMS } from '../mix-stems.js';

test('float WAV preserves stereo samples and headroom with fact/data lengths',()=>{
  const samples=new Float32Array([1.25,-2,.125,-.25]),bytes=stemWav(samples,2,48000),view=new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint32(4,true),bytes.byteLength-8);
  assert.equal(view.getUint16(20,true),3);assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(46,true),2);
  assert.equal(view.getUint32(54,true),16);samples.forEach((value,i)=>assert.equal(view.getFloat32(58+i*4,true),value));
  for(const invalid of [new Float32Array([NaN,0]),new Float32Array([Infinity,0]),new Float32Array([33,0])])assert.throws(()=>stemWav(invalid,1,48000));
  assert.throws(()=>stemWav(samples,3,48000));assert.throws(()=>stemWav(samples,2,192000));
});
test('stem receipts require the exact master clock, channels and hashes without training claims',()=>{
  const receipt={wav_sha256:'a'.repeat(64),frames:96000,sample_rate:48000,observed_context_start_frame:256};
  const value={schema_version:'1.0-mix-stems',scope:'aligned_post_fader_pre_limiter',training_authorized:false,...receipt,stems:Object.fromEntries(MIX_STEMS.map(name=>[name,'b'.repeat(64)]))};
  validateMixStems(value,receipt);
  for(const update of [{frames:96001},{sample_rate:96000},{training_authorized:true},{observed_context_start_frame:257},{wav_sha256:'c'.repeat(64)},{filename:'private.wav'},{stems:{a:'b'.repeat(64)}}])assert.throws(()=>validateMixStems({...value,...update},receipt));
});
