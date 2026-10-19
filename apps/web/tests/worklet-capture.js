class InstrumentCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.total = options.processorOptions.frames;
    this.pcm = new Float32Array(this.total * 2);
    this.frames = new Float64Array(this.total / 128);
    this.cursor = this.last = this.counterGaps = this.timestampGaps = 0;
    this.expectedTimestamp = -1;
  }
  process(inputs) {
    if (this.cursor >= this.total) return true;
    const [left, right] = inputs[0], counter = inputs[1]?.[0];
    if (!this.cursor && (!counter || counter[0] === 0)) return true;
    if (!left || !right || left.length !== 128 || right.length !== 128 || !counter || counter.length !== 128)
      throw new Error('Capture input missing or invalid');
    if (this.expectedTimestamp >= 0 && currentFrame !== this.expectedTimestamp) this.timestampGaps++;
    this.expectedTimestamp = currentFrame + 128;
    this.frames[this.cursor / 128] = currentFrame;
    for (let i = 0; i < 128; i++) {
      const frame = Math.round(counter[i] * 8388608);
      if (frame !== this.last + 1) this.counterGaps++;
      this.last = frame;
      this.pcm[(this.cursor + i) * 2] = left[i];
      this.pcm[(this.cursor + i) * 2 + 1] = right[i];
    }
    this.cursor += 128;
    if (this.cursor === this.total) this.port.postMessage({ type: 'capture-complete',
      pcm: this.pcm.buffer, frames: this.frames.buffer, counterGaps: this.counterGaps,
      timestampGaps: this.timestampGaps, lastCounter: this.last }, [this.pcm.buffer, this.frames.buffer]);
    return true;
  }
}
registerProcessor('instrument-capture', InstrumentCapture);
