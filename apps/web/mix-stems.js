import { TAKE_SECONDS } from './live-take.js';
export const MIX_STEMS = ['a', 'b', 'c', 'instruments'];
export function stemWav(samples, frames, rate) {
  if (!(samples instanceof Float32Array) || !Number.isInteger(rate) || rate < 32000 || rate > 96000 ||
    !Number.isInteger(frames) || frames < 1 || frames > rate * TAKE_SECONDS || samples.length < frames * 2)
    throw Error('Invalid stem audio');
  // IEEE float WAV preserves pre-limiter headroom; fact records the frame count.
  const bytes = new ArrayBuffer(58 + frames * 8), view = new DataView(bytes);
  const text = (at, value) => { for (let i=0;i<value.length;i++) view.setUint8(at+i,value.charCodeAt(i)); };
  text(0,'RIFF'); view.setUint32(4,bytes.byteLength-8,true); text(8,'WAVEfmt ');
  view.setUint32(16,18,true); view.setUint16(20,3,true); view.setUint16(22,2,true);
  view.setUint32(24,rate,true); view.setUint32(28,rate*8,true); view.setUint16(32,8,true); view.setUint16(34,32,true);
  text(38,'fact'); view.setUint32(42,4,true); view.setUint32(46,frames,true);
  text(50,'data'); view.setUint32(54,frames*8,true);
  for (let i=0;i<frames*2;i++) {
    if (!Number.isFinite(samples[i]) || Math.abs(samples[i]) > 32) throw Error('Invalid stem sample');
    view.setFloat32(58+i*4,samples[i],true);
  }
  return bytes;
}
export function validateMixStems(value, receipt) {
  const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...keys].sort().join(',');
  if (!exact(value,['schema_version','scope','training_authorized','wav_sha256','sample_rate','frames','observed_context_start_frame','stems']) ||
    value.schema_version !== '1.0-mix-stems' || value.scope !== 'aligned_post_fader_pre_limiter' || value.training_authorized !== false ||
    value.wav_sha256 !== receipt.wav_sha256 || typeof value.wav_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.wav_sha256) ||
    !Number.isInteger(value.sample_rate) || value.sample_rate < 32000 || value.sample_rate > 96000 || value.sample_rate !== receipt.sample_rate ||
    !Number.isInteger(value.frames) || value.frames < 1 || value.frames > value.sample_rate * TAKE_SECONDS || value.frames !== receipt.frames ||
    !Number.isSafeInteger(value.observed_context_start_frame) || value.observed_context_start_frame < 0 ||
    value.observed_context_start_frame !== receipt.observed_context_start_frame || !exact(value.stems,MIX_STEMS) ||
    !MIX_STEMS.every(name=>typeof value.stems[name] === 'string' && /^[a-f0-9]{64}$/.test(value.stems[name]))) throw Error('Invalid mix stems');
  return value;
}
