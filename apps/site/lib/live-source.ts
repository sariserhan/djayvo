export function liveGraph(context:AudioContext,stream:MediaStream){
 const source=context.createMediaStreamSource(stream),tone=context.createBiquadFilter(),dry=context.createGain(),
 delay=context.createDelay(1),wet=context.createGain(),direct=context.createGain(),output=context.createGain(),meter=context.createAnalyser();
 tone.type='lowpass';tone.frequency.value=18000;delay.delayTime.value=.3;wet.gain.value=0;output.gain.value=0;meter.fftSize=256;
 direct.gain.value=0;source.connect(direct);direct.connect(output);
 source.connect(tone);tone.connect(dry);dry.connect(output);tone.connect(delay);delay.connect(wet);wet.connect(output);output.connect(meter);meter.connect(context.destination);
 return {meter,set(level:number,hz:number,echo:number,bypass:boolean){
  if(![level,hz,echo].every(Number.isFinite)||level<0||level>.8||hz<100||hz>18000||echo<0||echo>.4)throw new Error('Invalid live control');
  output.gain.setTargetAtTime(level/(1+echo),context.currentTime,.015);tone.frequency.setTargetAtTime(hz,context.currentTime,.015);
  dry.gain.setTargetAtTime(bypass?0:1,context.currentTime,.015);direct.gain.setTargetAtTime(bypass?1:0,context.currentTime,.015);
  wet.gain.setTargetAtTime(bypass?0:echo,context.currentTime,.015);
 },stop(){for(const node of [source,tone,dry,delay,wet,direct,output,meter])node.disconnect();}};
}
