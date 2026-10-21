export const DECK_EFFECTS=['reverb','phaser','flanger'];
export const validDeckEffects=value=>value && Object.keys(value).length===3 && DECK_EFFECTS.every(name=>Number.isFinite(value[name])&&value[name]>=0&&value[name]<=.5);

export function createDeckEffects(context,destination) {
  const fx={input:context.createGain(),output:context.createGain(),targets:{reverb:0,phaser:0,flanger:0},nodes:[],oscillators:[],mixes:{}};
  fx.output.connect(destination);build(context,fx);return fx;
}
function build(context,fx) {
  let previous=fx.input;fx.prepare={};
  const node=n=>{fx.nodes.push(n);return n;};
  for(const name of DECK_EFFECTS){
    const dry=node(context.createGain()),wet=node(context.createGain()),sum=node(context.createGain());
    previous.connect(dry);dry.connect(sum);wet.connect(sum);dry.gain.value=1-fx.targets[name];wet.gain.value=fx.targets[name];
    fx.mixes[name]={dry,wet};
    const input=previous;fx.prepare[name]=()=>{
    if(name==='reverb'){
      const convolver=node(context.createConvolver()),buffer=context.createBuffer(2,Math.ceil(context.sampleRate*.9),context.sampleRate);
      let seed=7183;
      for(let c=0;c<2;c++){const pcm=buffer.getChannelData(c);for(let i=0;i<pcm.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pcm[i]=(seed/2147483648-1)*Math.exp(-7*i/pcm.length);}}
      convolver.buffer=buffer;input.connect(convolver);convolver.connect(wet);
    }else{
      const oscillator=node(context.createOscillator());oscillator.frequency.value=name==='phaser'?.23:.17;fx.oscillators.push(oscillator);
      if(name==='phaser'){
        let phase=input;
        for(const frequency of [320,640,1280,2560]){const filter=node(context.createBiquadFilter()),depth=node(context.createGain());filter.type='allpass';filter.frequency.value=frequency;filter.Q.value=.5;depth.gain.value=frequency*.65;oscillator.connect(depth);depth.connect(filter.frequency);phase.connect(filter);phase=filter;}phase.connect(wet);
      }else{
        const delay=node(context.createDelay(.02)),depth=node(context.createGain());delay.delayTime.value=.003;depth.gain.value=.002;oscillator.connect(depth);depth.connect(delay.delayTime);input.connect(delay);delay.connect(wet);
      }
      oscillator.start();
    }
    delete fx.prepare[name];};
    if(fx.targets[name]>0)fx.prepare[name]();
    previous=sum;
  }
  previous.connect(fx.output);
}
export function updateDeckEffects(context,fx,values){
  if(!validDeckEffects(values))throw Error('Invalid deck effects');
  try{for(const name of DECK_EFFECTS){if(values[name]>0)fx.prepare[name]?.();fx.mixes[name].dry.gain.setTargetAtTime(1-values[name],context.currentTime,.01);fx.mixes[name].wet.gain.setTargetAtTime(values[name],context.currentTime,.01);}}
  catch(error){fx.mixer?.automationTrace?.invalidate();throw error;}
  fx.targets={...values};
  fx.mixer?.automationTrace?.append({kind:'deck_effects',target:fx.target,context_frame:Math.round(context.currentTime*context.sampleRate),...values});
}
export function clearDeckEffects(context,fx){
  fx.input.disconnect();for(const osc of fx.oscillators)osc.stop();for(const node of fx.nodes)node.disconnect();
  fx.nodes=[];fx.oscillators=[];build(context,fx);
  fx.mixer?.automationTrace?.append({kind:'clear_deck_effects',target:fx.target,context_frame:Math.round(context.currentTime*context.sampleRate)});
}
