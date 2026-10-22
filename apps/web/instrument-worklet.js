import {StepSequence} from './step-sequence.js';
import { TakeBuffer, executeCommand, validCommand } from './live-take.js';
class JamloomInstruments extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new WebAssembly.Instance(options.processorOptions.module, {}).exports;
    this.engine._initialize();
    if (!this.engine.jamloom_live_init(sampleRate)) throw new Error('Unsupported instrument sample rate');
    this.samples = new Float32Array(this.engine.memory.buffer, this.engine.jamloom_live_buffer(), 4096);
    this.renderSequence=count=>this.render(count);
    this.emitSequence=command=>{
      if(command.type==='off'){this.engine.jamloom_live_off(command.id);this.record(command);}
      else if(this.engine.jamloom_live_note(command.id,command.patch,command.pitch,command.velocity))this.record(command);
      else{this.sequence=null;this.accept({type:'panic'});this.port.postMessage({type:'sequence-stopped',message:'Instrument voice limit reached.'});}
    };
    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== 'object') return;
      if(data.type==='sequence-start'){
        this.sequence=null;this.accept({type:'panic'});
        try{this.sequence=new StepSequence(sampleRate,data.pattern,data.patch,data.velocity);this.port.postMessage({type:'sequence-started'});}
        catch(error){this.port.postMessage({type:'sequence-stopped',message:error.message});}return;
      }
      if(data.type==='sequence-stop'||data.type==='panic'||data.type==='take-start'){this.sequence=null;this.accept({type:'panic'});this.port.postMessage({type:'sequence-stopped'});if(data.type==='sequence-stop'||data.type==='panic')return;}
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
          first: take.first, frames: take.frames, events: take.events, samples: take.samples }, [take.samples.buffer]);
        return;
      }
      if (validCommand(data) && !this.accept(data)) this.port.postMessage({ type: 'rejected' });
    };
    this.port.postMessage({ type: 'ready' });
  }
  accept(command) {
    if (!executeCommand(this.engine, command)) return false;
    this.record(command); return true;
  }
  record(command) {
    if (this.take && !this.take.accepted(command)) {
      this.take = null; this.port.postMessage({ type: 'take-failed', token: this.token });
    }
  }
  render(frames){
    if(!this.engine.jamloom_live_render(frames))return;
    if(this.take){this.take.first ??= currentFrame + this.offset;this.take.copy(this.samples,frames);}
    for(let c=0;c<this.output.length;c++)for(let i=0;i<frames;i++)this.output[c][this.offset+i]=this.samples[i*2+Math.min(c,1)];
    this.offset+=frames;
  }
  process(inputs, outputs) {
    this.output=outputs[0];this.offset=0;const frames=this.output[0]?.length??0;
    if(frames&&frames<=2048){if(this.sequence)this.sequence.run(frames,this.renderSequence,this.emitSequence);else this.render(frames);}
    return true;
  }
}
registerProcessor('jamloom-instruments', JamloomInstruments);
