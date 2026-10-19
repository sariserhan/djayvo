class ContinuityProbe extends AudioWorkletProcessor {
  constructor() {
    super(); this.blocks = 0; this.silent = 0; this.gaps = 0; this.expected = -1; this.armed = false;
    this.port.onmessage = ({ data }) => {
      if (data === 'start') { this.armed = true; this.blocks = this.silent = this.gaps = 0; this.expected = -1; }
      else this.port.postMessage({ blocks: this.blocks, silent: this.silent, frameGaps: this.gaps });
    };
  }
  process(inputs) {
    const data = inputs[0]?.[0];
    if (data && this.armed) {
      if (this.expected >= 0 && currentFrame !== this.expected) this.gaps++;
      this.expected = currentFrame + data.length;
      let energy = 0; for (const x of data) energy += x * x;
      if (energy / data.length < 1e-8) this.silent++;
      this.blocks++;
    }
    return true;
  }
}
registerProcessor('continuity-probe', ContinuityProbe);
