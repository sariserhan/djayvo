class ContinuityProbe extends AudioWorkletProcessor {
  constructor() {
    super(); this.blocks = 0; this.silent = 0; this.gaps = 0; this.expected = -1; this.armed = false; this.events = [];
    this.signalLast = 0; this.signalGaps = 0; this.signalFrames = 0; this.frames = 0;
    this.port.onmessage = ({ data }) => {
      if (data === 'start') { this.armed = true; this.blocks = this.silent = this.gaps = 0; this.expected = -1; this.events = []; this.signalLast = this.signalGaps = this.signalFrames = this.frames = 0; }
      else this.port.postMessage({ blocks: this.blocks, silent: this.silent, frameGaps: this.gaps, events: this.events, signalFrameGaps: this.signalGaps, signalFrames: this.signalFrames, processedFrames: this.frames });
    };
  }
  process(inputs) {
    const data = inputs[0]?.[0];
    if (data && this.armed) {
      this.frames += data.length;
      // An independent PCM counter separates stale browser timestamps from missing samples.
      const reference = inputs[1]?.[0];
      if (reference) for (const sample of reference) {
        const frame = Math.round(sample * 8388608);
        if (this.signalLast && frame !== this.signalLast + 1) this.signalGaps++;
        if (frame > 0) this.signalFrames++;
        this.signalLast = frame;
      }
      else if (this.signalLast) this.signalGaps++;
      if (this.expected >= 0 && currentFrame !== this.expected) {
        this.gaps++;
        if (this.events.length < 16) this.events.push({ frame: currentFrame, expected: this.expected, delta: currentFrame - this.expected, block: this.blocks, sampleRate, signalFrame: this.signalLast, signalFrameGaps: this.signalGaps });
      }
      this.expected = currentFrame + data.length;
      let energy = 0; for (const x of data) energy += x * x;
      if (energy / data.length < 1e-8) this.silent++;
      this.blocks++;
    }
    return true;
  }
}
registerProcessor('continuity-probe', ContinuityProbe);
