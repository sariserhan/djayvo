class JamloomInstruments extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new WebAssembly.Instance(options.processorOptions.module, {}).exports;
    this.engine._initialize();
    if (!this.engine.jamloom_live_init(sampleRate)) throw new Error('Unsupported instrument sample rate');
    this.samples = new Float32Array(this.engine.memory.buffer, this.engine.jamloom_live_buffer(), 4096);
    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'mouth' && Number.isFinite(data.position) && data.position >= 0 && data.position <= 1) this.engine.jamloom_live_mouth(data.position);
      else if (data.type === 'panic') this.engine.jamloom_live_panic();
      else if (data.type === 'off' && Number.isInteger(data.id) && data.id > 0 && data.id <= 0xffffffff)
        this.engine.jamloom_live_off(data.id);
      else if (data.type === 'note' && [data.id, data.patch, data.pitch, data.velocity].every(Number.isInteger)
        && data.id > 0 && data.id <= 0xffffffff && data.patch >= 0 && data.patch <= 12
        && data.pitch >= 21 && data.pitch <= 108 && data.velocity >= 1 && data.velocity <= 127) {
        if (!this.engine.jamloom_live_note(data.id, data.patch, data.pitch, data.velocity))
          this.port.postMessage({ type: 'rejected' });
      }
    };
    this.port.postMessage({ type: 'ready' });
  }
  process(inputs, outputs) {
    const output = outputs[0], frames = output[0]?.length ?? 0;
    if (frames && frames <= 2048 && this.engine.jamloom_live_render(frames)) {
      for (let channel = 0; channel < output.length; channel++)
        for (let frame = 0; frame < frames; frame++) output[channel][frame] = this.samples[frame * 2 + Math.min(channel, 1)];
    }
    return true;
  }
}
registerProcessor('jamloom-instruments', JamloomInstruments);
