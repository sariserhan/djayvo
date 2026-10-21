import { DeckDSP } from './deck-dsp.js';
class JamloomDeck extends AudioWorkletProcessor {
  constructor(options) {
    super(); this.dsp = new DeckDSP(options.processorOptions.channels, sampleRate);
    this.token = 0; this.blocks = 0; this.alive = true;
    this.positionEvent={type:'position',position:0,playing:false,token:0};
    this.port.onmessage = ({data: d}) => {
      if (!d || typeof d !== 'object') return;
      const p = this.dsp;
      if (d.type === 'dispose') { this.alive = false; return; }
      if (d.type === 'play' && Number.isSafeInteger(d.token) && Number.isFinite(d.position)) {
        this.token = d.token; p.seek(d.position * sampleRate); p.playing = true;
      }
      if (d.type === 'pause') { this.token = d.token; p.playing = false; p.scratch = false; }
      if (d.type === 'rate' && Number.isFinite(d.value) && d.value >= .84 && d.value <= 1.16) p.speed = d.value;
      if (d.type === 'keylock' && typeof d.value === 'boolean') { p.keylock = d.value; p.seek(p.position); }
      if (d.type === 'loop' && typeof d.value === 'boolean' && Number.isFinite(d.start) && Number.isFinite(d.end) && d.start >= 0 && d.end > d.start && d.end <= p.length / sampleRate) {
        p.loop = d.value; p.loopStart = d.start * sampleRate; p.loopEnd = d.end * sampleRate;
      }
      if (d.type === 'scratch' && Number.isFinite(d.speed) && Math.abs(d.speed) <= 4) {
        p.scratch = true; p.scratchSpeed = d.speed; p.scratchFrames = Math.round(sampleRate * .08); p.loop = false;
      }
      if (d.type === 'scratch-end') { p.scratch = false; p.seek(p.position); }
    };
    this.port.postMessage({type:'ready'});
  }
  process(inputs, outputs) {
    if (!this.alive) return false;
    const wasPlaying = this.dsp.playing;
    this.dsp.process(outputs[0]);
    if (++this.blocks % 8 === 0 || wasPlaying && !this.dsp.playing){
      this.positionEvent.position=this.dsp.position/sampleRate;this.positionEvent.playing=this.dsp.playing;this.positionEvent.token=this.token;
      this.port.postMessage(this.positionEvent);
    }
    return true;
  }
}
registerProcessor('jamloom-deck', JamloomDeck);
