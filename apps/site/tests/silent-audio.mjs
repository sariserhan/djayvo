// Test-only speaker isolation. Recording taps and the real-time audio clock stay upstream.
export function silenceSpeakers() {
 const connect=AudioNode.prototype.connect, outputs=new Map();
 AudioNode.prototype.connect=function(target,...ports){
  if(target instanceof AudioDestinationNode && !(this.context instanceof OfflineAudioContext)){
   let output=outputs.get(target);
   if(!output){
    const gain=this.context.createGain(),meter=this.context.createAnalyser();gain.gain.value=0;
    connect.call(gain,meter);connect.call(meter,target);output={gain,meter};outputs.set(target,output);
   }
   connect.call(this,output.gain,...ports);return target;
  }
  return connect.call(this,target,...ports);
 };
 // Course fixtures use FrameDeck; prevent incidental native preview/narration output too.
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};
 if(globalThis.speechSynthesis)globalThis.speechSynthesis.speak=()=>{};
 globalThis.__jamloomSilentOutput=()=>Array.from(outputs.values(),({gain,meter})=>{
  const samples=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(samples);
  return {gain:gain.gain.value,peak:Math.max(...samples.map(Math.abs))};
 });
}
