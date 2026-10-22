// Prepared buffers and all scheduled starts share one AudioContext clock.
export class SessionTransport {
  constructor(context, nextBar, changed = () => {}) {
    this.context = context; this.nextBar = nextBar; this.changed = changed;
    this.a = null; this.c = null; this.origin = 0; this.end = 0;
  }
  snapshot() {
    const voice = v => v ? {start_frame:v.frame,end_frame:v.frame+Math.round(v.source.buffer.duration*this.context.sampleRate)} : null;
    return {a:voice(this.a),c:voice(this.c),tempo_milli_bpm:this.tempo??0,origin_frame:this.origin};
  }
  play(buffer, destination, frame, ended) {
    if (!Number.isInteger(frame) || frame < Math.ceil(this.context.currentTime * this.context.sampleRate))
      throw new Error('The entry time has passed. Arm again.');
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    const time = frame / this.context.sampleRate;
    source.buffer = buffer; source.connect(gain); gain.connect(destination);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + .005);
    gain.gain.setValueAtTime(1, time + Math.max(.005, buffer.duration - .005));
    gain.gain.linearRampToValueAtTime(0, time + buffer.duration);
    const voice = { source, gain, frame };
    source.onended = () => { source.disconnect(); gain.disconnect(); ended(voice); };
    source.start(time);
    return voice;
  }
  startA(buffer, destination, tempo, downbeat) {
    if (!Number.isInteger(tempo) || tempo < 60000 || tempo > 180000 || !Number.isFinite(downbeat) || downbeat < 0 || downbeat >= buffer.duration)
      throw new Error('Confirm a 60–180 BPM tempo and a downbeat inside the track.');
    this.stop();
    const rate = this.context.sampleRate, frame = Math.ceil((this.context.currentTime + .1) * rate);
    this.tempo = tempo; this.origin = frame + Math.round(downbeat * rate);
    this.end = frame + Math.round(buffer.duration * rate);
    this.a = this.play(buffer, destination, frame, voice => {
      if (this.a === voice) { this.a = null; this.stopC(); this.changed(); }
    });
    this.changed();
    return frame;
  }
  preview(buffer, destination) {
    if (this.a) throw new Error('Stop A before previewing C.');
    this.stopC();
    const frame = Math.ceil((this.context.currentTime + .05) * this.context.sampleRate);
    this.c = this.play(buffer, destination, frame, voice => { if (this.c === voice) { this.c = null; this.changed(); } });
    this.changed();
  }
  arm(buffer, destination) {
    if (!this.a) throw new Error('Start prepared Deck A before arming C.');
    const rate = this.context.sampleRate;
    const frame = this.nextBar(Math.ceil((this.context.currentTime + .15) * rate), this.origin, rate, this.tempo);
    if (frame < 0 || frame + Math.ceil(buffer.duration * rate) > this.end)
      throw new Error('Not enough Deck A remains for this performance. Restart A or use a longer track.');
    this.stopC();
    this.c = this.play(buffer, destination, frame, voice => { if (this.c === voice) { this.c = null; this.changed(); } });
    this.changed();
    return frame;
  }
  stopC() {
    if (!this.c) return;
    this.release(this.c); this.c = null; this.changed();
  }
  release(voice) {
    const now = this.context.currentTime;
    const held = voice.gain.gain.value;
    voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(held, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + .005);
    voice.source.stop(now + .005);
  }
  stop() {
    this.stopC();
    if (this.a) { this.release(this.a); this.a = null; this.changed(); }
  }
}
