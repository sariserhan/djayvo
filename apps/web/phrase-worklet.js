import {PhraseWindow} from './phrase-window.js';
class PhraseCapture extends AudioWorkletProcessor {
  constructor(){
    super();this.stopped=false;this.capture=null;this.packet={frames:0,buffer:null};this.transfer=[null];
    this.port.onmessage=({data})=>{
      if(data==='stop'){this.stopped=true;this.capture=null;return;}
      if(this.stopped)return;
      if(data instanceof ArrayBuffer&&data.byteLength===sampleRate*5*4){
        this.capture=new PhraseWindow(sampleRate,new Float32Array(data));this.packet.buffer=data;this.transfer[0]=data;
      }
    };
  }
  process(inputs){
    if(this.stopped)return false;
    const frames=this.capture?.push(inputs[0]?.[0]);
    if(frames){this.packet.frames=frames;this.port.postMessage(this.packet,this.transfer);this.capture=null;}
    // Capture is never monitored. The preallocated buffer is returned only after the answer ends.
    return true;
  }
}
registerProcessor('jamloom-phrase-capture',PhraseCapture);
