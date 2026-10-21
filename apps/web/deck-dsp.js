// Bounded overlap/add at unity grain pitch; transport speed controls grain placement.
export class DeckDSP {
  constructor(channels, rate) {
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 ||
        !Number.isFinite(rate) || rate < 8000 || rate > 192000 ||
        !channels.every(c => c instanceof Float32Array && c.length === channels[0].length) ||
        !channels[0].length || channels[0].length * channels.length * 4 > 128 * 1024 * 1024)
      throw Error('Invalid deck PCM');
    this.channels = channels; this.rate = rate; this.length = channels[0].length;
    this.position = 0; this.speed = 1; this.playing = false; this.keylock = false;
    this.loopStart = 0; this.loopEnd = this.length; this.loop = false;
    this.scratch = false; this.scratchFrames = 0; this.scratchSpeed = 0; this.gain = 0;
    this.hop = 1024; this.phase = 0; this.old = -1024; this.next = 0;
    this.window = Float32Array.from({length: this.hop}, (_, i) => .5 - .5 * Math.cos(Math.PI * i / this.hop));
  }
  seek(frame) {
    if (!Number.isFinite(frame)) return;
    this.position = Math.max(0, Math.min(this.length, frame));
    this.old = this.position - this.hop; this.next = this.position; this.phase = 0;
  }
  read(channel, frame) {
    if (this.loop && frame >= this.loopEnd) frame = this.loopStart + (frame - this.loopStart) % (this.loopEnd - this.loopStart);
    if (frame < 0 || frame >= this.length) return 0;
    const index = Math.floor(frame), fraction = frame - index, pcm = this.channels[channel];
    let following = index + 1;
    if (this.loop && following >= this.loopEnd) following = this.loopStart;
    return pcm[index] * (1 - fraction) + (pcm[Math.floor(following)] ?? 0) * fraction;
  }
  grain() {
    this.old = this.next;
    const expected = Math.round(this.position);
    let best = expected, error = Infinity;
    // Fixed 257 candidates x 64 samples, shared alignment for stereo phase coherence.
    for (let delta = -512; delta <= 512; delta += 4) {
      const candidate = expected + delta;
      if (candidate < 0 || candidate >= this.length) continue;
      let difference = 0;
      for (let i = 0; i < 512; i += 8) for (let c = 0; c < this.channels.length; c++) {
        const d = this.read(c, this.old + this.hop + i) - this.read(c, candidate + i);
        difference += d * d;
      }
      // Prefer the expected position for silence or equivalent matches.
      difference += Math.abs(delta) * 1e-10;
      if (difference < error) { error = difference; best = candidate; }
    }
    this.next = best; this.phase = 0;
  }
  process(output) {
    for (let i = 0; i < output[0].length; i++) {
      if (this.scratch && this.scratchFrames > 0 && --this.scratchFrames === 0) this.scratchSpeed = 0;
      const speed = this.scratch ? this.scratchSpeed : this.speed;
      const audible = this.playing && (!this.scratch || Math.abs(speed) > .001);
      this.gain += Math.max(-1 / 240, Math.min(1 / 240, (audible ? 1 : 0) - this.gain));
      const locked = this.keylock && !this.scratch && this.speed !== 1;
      if (locked && this.phase === this.hop) this.grain();
      for (let c = 0; c < output.length; c++) {
        const channel = Math.min(c, this.channels.length - 1);
        const value = locked ? this.read(channel, this.old + this.hop + this.phase) * (1 - this.window[this.phase]) +
          this.read(channel, this.next + this.phase) * this.window[this.phase] : this.read(channel, this.position);
        output[c][i] = value * this.gain;
      }
      if (this.playing || this.gain > 0) {
        this.position += speed;
        if (locked) this.phase++;
        if (this.loop && this.position >= this.loopEnd) this.position = this.loopStart + (this.position - this.loopStart) % (this.loopEnd - this.loopStart);
        else if (this.position >= this.length) { this.position = this.length; this.playing = false; }
        else if (this.position < 0) this.position = 0;
      }
    }
  }
}
