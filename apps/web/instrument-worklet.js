import { TakeBuffer, executeCommand, validCommand } from './live-take.js';
class JamloomInstruments extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new WebAssembly.Instance(options.processorOptions.module, {}).exports;
    this.engine._initialize();
    if (!this.engine.jamloom_live_init(sampleRate)) throw new Error('Unsupported instrument sample rate');
    this.samples = new Float32Array(this.engine.memory.buffer, this.engine.jamloom_live_buffer(), 4096);
    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'take-start' && Number.isSafeInteger(data.token) && data.token > 0 && !this.take) {
        try {
          this.take = new TakeBuffer(sampleRate, data.mouth); this.token = data.token;
          this.engine.jamloom_live_init(sampleRate); this.engine.jamloom_live_mouth(data.mouth);
          this.port.postMessage({ type: 'take-started', token: this.token });
        } catch { this.take = null; this.port.postMessage({ type: 'take-failed', token: data.token }); }
        return;
      }
      if (data.type === 'take-cancel' && data.token === this.token) { this.take = null; return; }
      if (data.type === 'take-stop' && this.take && data.token === this.token) {
        const take = this.take; this.take = null;
        this.port.postMessage({ type: 'take-done', token: this.token, rate: take.rate, mouth: take.mouth,
          frames: take.frames, events: take.events, samples: take.samples }, [take.samples.buffer]);
        return;
      }
      if (validCommand(data)) {
        if (!executeCommand(this.engine, data)) this.port.postMessage({ type: 'rejected' });
        else if (this.take && !this.take.accepted(data)) {
          this.take = null; this.port.postMessage({ type: 'take-failed', token: this.token });
        }
      }
    };
    this.port.postMessage({ type: 'ready' });
  }
  process(inputs, outputs) {
    const output = outputs[0], frames = output[0]?.length ?? 0;
    if (frames && frames <= 2048 && this.engine.jamloom_live_render(frames)) {
      if (this.take) this.take.copy(this.samples, frames);
      for (let channel = 0; channel < output.length; channel++)
        for (let frame = 0; frame < frames; frame++) output[channel][frame] = this.samples[frame * 2 + Math.min(channel, 1)];
    }
    return true;
  }
}
registerProcessor('jamloom-instruments', JamloomInstruments);
