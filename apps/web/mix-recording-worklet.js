import { TAKE_SECONDS } from './live-take.js';

class JamloomMixRecording extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    if (!Number.isInteger(sampleRate) || sampleRate < 32000 || sampleRate > 192000) throw new Error('Unsupported recording rate');
    const stems = options.processorOptions?.stems === true;
    if (stems && sampleRate > 96000) throw new Error('Stem capture supports up to 96 kHz');
    this.stems = stems ? Array.from({length:4},()=>new Float32Array(sampleRate * TAKE_SECONDS * 2)) : null;
    // Allocate once at explicit capture creation, never inside process().
    this.pcm = new Float32Array(sampleRate * TAKE_SECONDS * 2);
    this.armed=false;this.warmNext=-1;this.warmCount=0;
    this.frames = 0; this.first = -1; this.next = -1; this.discontinuities = 0; this.done = false;
    this.port.onmessage = ({ data }) => {
      if (this.done || !['stop', 'cancel'].includes(data?.type)) return;
      this.done = true;
      if (data.type === 'stop') this.port.postMessage({ type: 'complete', samples: this.pcm,
        frames: this.frames, rate: sampleRate, first: this.first, discontinuities: this.discontinuities,
        capped: this.frames === sampleRate * TAKE_SECONDS, ...(this.stems ? {stems:this.stems} : {}) }, [this.pcm.buffer, ...(this.stems?.map(s=>s.buffer) ?? [])]);
      this.pcm = this.stems = null;
      if (data.type === 'cancel') this.port.postMessage({ type: 'cancelled' });
    };
  }
  process(inputs, outputs) {
    if (this.done) return false;
    const frames = outputs[0][0].length, count = Math.min(frames, this.pcm.length / 2 - this.frames);
    if (!count) return true;
    if(!this.armed){
      if(!inputs[0][0])return true;
      this.warmCount=currentFrame===this.warmNext?this.warmCount+1:0;this.warmNext=currentFrame+frames;
      if(this.warmCount<2)return true;
      this.armed=true;this.port.postMessage({type:'started'});
    }
    if (this.first < 0) this.first = currentFrame;
    if (this.next >= 0 && currentFrame !== this.next) this.discontinuities++;
    this.next = currentFrame + frames;
    const left = inputs[0][0], right = inputs[0][1] || left;
    for (let i = 0; i < count; i++) {
      this.pcm[(this.frames + i) * 2] = left ? left[i] : 0;
      this.pcm[(this.frames + i) * 2 + 1] = right ? right[i] : 0;
    }
    if (this.stems) for (let stem=0;stem<4;stem++) {
      const left=inputs[stem+1]?.[0], right=inputs[stem+1]?.[1] || left, pcm=this.stems[stem];
      for (let i=0;i<count;i++) {
        pcm[(this.frames+i)*2]=left?left[i]:0;
        pcm[(this.frames+i)*2+1]=right?right[i]:0;
      }
    }
    this.frames += count;
    // This is a silent side branch. The existing mixer-to-speaker route stays intact.
    return true;
  }
}
registerProcessor('jamloom-mix-recording', JamloomMixRecording);
