// Appended to the unchanged production instrument-worklet.js by the isolated test server.
class InstrumentLoadProbe extends JamloomInstruments {
  constructor(options) {
    super(options);
    this.events = options.processorOptions.events;
    this.total = options.processorOptions.frames;
    this.cursor = this.next = this.commands = 0;
    this.durations = new Float64Array(this.total / 128);
    this.commandFrames = new Uint32Array(this.events.length * this.total / 480000);
    this.clock = typeof globalThis.performance?.now === 'function' ? 'performance.now' :
      typeof Date === 'function' ? 'Date.now' : null;
    this.clockNow = this.clock === 'performance.now' ? () => performance.now() :
      this.clock === 'Date.now' ? () => Date.now() : () => -1;
  }
  process(inputs, outputs, parameters) {
    if (this.cursor >= this.total) return true;
    if (outputs[0][0].length !== 128) throw new Error('Probe requires 128-frame blocks');
    const start = this.clockNow(), local = this.cursor % 480000;
    if (local === 0) this.next = 0;
    while (this.next < this.events.length && this.events[this.next][0] === local) {
      const [, on, id, patch, pitch, velocity] = this.events[this.next++];
      this.port.onmessage({ data: on ? { type: 'note', id, patch, pitch, velocity } : { type: 'off', id } });
      this.commandFrames[this.commands] = this.cursor;
      this.commands++;
    }
    const active = super.process(inputs, outputs, parameters);
    this.durations[this.cursor / 128] = this.clock ? this.clockNow() - start : -1;
    this.cursor += 128;
    if (this.cursor === this.total) this.port.postMessage({ type: 'engine-complete',
      commands: this.commands, clock: this.clock, durations: this.durations.buffer,
      commandFrames: this.commandFrames.buffer,
      memoryBytes: this.engine.memory.buffer.byteLength, active: this.engine.jamloom_live_active() },
      [this.durations.buffer, this.commandFrames.buffer]);
    return active;
  }
}
registerProcessor('instrument-load-probe', InstrumentLoadProbe);
