const modules = new WeakMap();
// Course buffers share the mixer clock. Ordinary imported media keeps its native decoder.
export class FrameDeck extends EventTarget {
  constructor(media, context, destination) {
    super(); this.media=media; this.context=context; this.destination=destination;
    this.buffer=null; this.voice=null; this.offset=0; this.anchor=0; this.speed=1; this.repeat=false; this.region=null;this.roll=null;
    for(const event of ['play','pause','ended','timeupdate','loadedmetadata','error'])media.addEventListener(event,()=>{if(!this.buffer){this.dispatchEvent(new Event(event));if(event!=='timeupdate')this.observe(event);}});
  }
  transportState() {
    const duration=this.buffer?.duration??this.media.duration;
    const loaded=Number.isFinite(duration)&&duration>0;
    return {mode:!loaded?'empty':this.processor?'worklet':this.buffer?'buffer':'media',
      duration_seconds:loaded?duration:0, position_seconds:loaded?this.currentTime:0,
      playing:loaded&&!this.paused, rate:this.playbackRate??1, loop:!!this.loop,
      region_seconds:this.region?[...this.region]:null, key_lock:!!this.preservesPitch,
      scratching:!!this.scratching, scratch_speed:this.scratching?this.scratchSpeed??0:0,
      roll:this.roll?{position_seconds:this.roll.position,context_seconds:this.roll.time}:null};
  }
  observe(action) { const event=new Event('transportchange');event.action=action;this.dispatchEvent(event); }
  disposeDSP(){if(this.processor){this.processor.port.postMessage({type:'dispose'});this.processor.disconnect();this.processor.port.close();this.processor=null;}this.scratching=false;}
  useBuffer(buffer){this.pause();this.disposeDSP();this.media.removeAttribute('src');this.media.load();this.buffer=buffer;this.offset=0;this.speed=1;this.region=null;this.repeat=false;this.roll=null;this.dispatchEvent(new Event('loadedmetadata'));this.observe('source');}
  async prepareDSP(buffer) {
    const ctx=this.context();
    if(buffer.sampleRate!==ctx.sampleRate)throw Error('Deck audio must match the mixer sample rate.');
    if(!modules.has(ctx))modules.set(ctx,ctx.audioWorklet.addModule(new URL('./deck-worklet.js',import.meta.url)).catch(error=>{modules.delete(ctx);throw error;}));
    await modules.get(ctx);
    const node=new AudioWorkletNode(ctx,'jamloom-deck',{numberOfInputs:0,outputChannelCount:[2],processorOptions:{channels:Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i))}});
    try { await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Deck processor did not start.')),10000);
      node.onprocessorerror=()=>{clearTimeout(timer);reject(Error('Deck processor failed.'));};
      node.port.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);resolve();}};
    }); } catch(error) {node.port.postMessage({type:'dispose'});node.port.close();node.disconnect();throw error;}
    return node;
  }
  useDSP(buffer,node){
    this.useBuffer(buffer);this.processor=node;this.token=0;this.locked=false;
    node.connect(this.destination());
    node.onprocessorerror=()=>{this.pause();this.dispatchEvent(new Event('error'));};
    node.port.onmessage=({data})=>{
      if(data.type!=='position'||data.token!==this.token||!this.voice)return;
      if(this.scratching||this.resync){this.offset=data.position;this.anchor=this.context().currentTime;this.resync=false;}
      if(!data.playing){this.voice=null;this.offset=this.buffer.duration;this.dispatchEvent(new Event('ended'));this.observe('ended');}
    };
    this.observe('source');
  }
  send(message){this.processor?.port.postMessage(message);}
  syncLoop(){this.send({type:'loop',value:this.repeat,start:this.region?.[0]??0,end:this.region?.[1]??this.buffer.duration});}
  get currentTime(){
    if(!this.buffer)return this.media.currentTime;
    if(this.scratching)return this.offset;
    const value=this.offset+(this.voice?Math.max(0,this.context().currentTime-this.anchor)*this.speed:0);
    if(this.repeat){const [start,end]=this.region??[0,this.buffer.duration];return value>=end?start+(value-start)%(end-start):value;}
    return Math.min(value,this.buffer.duration);
  }
  set currentTime(value){if(!this.buffer){this.media.currentTime=value;this.observe('seek');return;}if(!Number.isFinite(value))throw Error('Invalid seek');if(this.roll){this.roll=null;this.repeat=false;this.region=null;}const playing=!!this.voice;this.release();this.offset=Math.max(0,Math.min(value,this.buffer.duration));if(playing&&this.offset<this.buffer.duration)this.play();else if(playing)this.dispatchEvent(new Event('pause'));this.observe('seek');}
  get paused(){return this.buffer?!this.voice:this.media.paused;}
  get ended(){return this.buffer?!this.repeat&&this.currentTime>=this.buffer.duration:this.media.ended;}
  get playbackRate(){return this.buffer?this.speed:this.media.playbackRate;}
  set playbackRate(value){if(!this.buffer){this.media.playbackRate=value;this.observe('rate');return;}if(!Number.isFinite(value)||value<.84||value>1.16)throw Error('Invalid playback rate');if(this.roll){this.roll.position=this.rollPosition();this.roll.time=this.context().currentTime;}this.offset=this.currentTime;this.anchor=this.context().currentTime;this.speed=value;this.voice?.source?.playbackRate.setValueAtTime(value,this.anchor);this.send({type:'rate',value});this.observe('rate');}
  get readyState(){return this.buffer?4:this.media.readyState;} get seeking(){return this.buffer?false:this.media.seeking;} get error(){return this.buffer?null:this.media.error;}
  get src(){return this.media.src;} set src(value){this.pause();this.disposeDSP();this.buffer=null;this.media.src=value;this.observe('source');}
  get preservesPitch(){return this.buffer?!!this.processor&&this.locked:this.media.preservesPitch;} set preservesPitch(value){this.media.preservesPitch=value;this.locked=!!value;this.send({type:'keylock',value:this.locked});this.observe('keylock');}
  get loop(){return this.buffer?this.repeat:this.media.loop;} set loop(value){if(!this.buffer){this.media.loop=value;this.observe('loop');return;}this.offset=this.currentTime;this.anchor=this.context().currentTime;this.repeat=!!value;if(this.voice?.source){this.voice.source.loop=this.repeat;[this.voice.source.loopStart,this.voice.source.loopEnd]=this.region??[0,this.buffer.duration];}this.syncLoop();this.observe('loop');}
  removeAttribute(name){if(name==='src'){this.pause();this.disposeDSP();this.buffer=null;this.region=null;}this.media.removeAttribute(name);if(name==='src')this.observe('source');}
  load(){this.media.load();}
  release(){if(!this.voice)return;const voice=this.voice;this.voice=null;if(this.processor){this.send({type:'pause',token:++this.token});this.scratching=false;return;}const now=this.context().currentTime;voice.source.onended=null;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.005);voice.source.stop(now+.005);voice.source.onended=()=>{voice.source.disconnect();voice.gain.disconnect();};}
  play(){
    if(!this.buffer)return this.media.play();if(this.voice)return Promise.resolve();
    const ctx=this.context();if(this.ended)this.offset=0;
    if(this.processor){this.anchor=ctx.currentTime;this.voice={dsp:true};this.syncLoop();this.send({type:'play',position:this.offset,token:++this.token});this.dispatchEvent(new Event('play'));this.observe('play');return Promise.resolve();}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=this.buffer;source.playbackRate.value=this.speed;source.loop=this.repeat;
    [source.loopStart,source.loopEnd]=this.region??[0,this.buffer.duration];source.connect(gain);gain.connect(this.destination());
    this.anchor=Math.ceil(ctx.currentTime*ctx.sampleRate)/ctx.sampleRate;gain.gain.setValueAtTime(0,this.anchor);gain.gain.linearRampToValueAtTime(1,this.anchor+.005);
    const voice=this.voice={source,gain};source.onended=()=>{source.disconnect();gain.disconnect();if(this.voice!==voice)return;this.voice=null;this.offset=this.buffer.duration;this.dispatchEvent(new Event('ended'));this.observe('ended');};
    source.start(this.anchor,this.offset);this.dispatchEvent(new Event('play'));this.observe('play');return Promise.resolve();
  }
  pause(){if(!this.buffer){this.media.pause();return;}const playing=!!this.voice;const position=this.roll?this.rollPosition():this.currentTime;if(this.roll){this.roll=null;this.region=null;this.repeat=false;}this.offset=position;this.release();if(playing)this.dispatchEvent(new Event('pause'));this.observe('pause');}
  beatLoop(beats,bpm){
    if(this.roll)throw Error('Exit the roll before setting another loop.');
    if(!this.buffer||![1,2,4,8,16,32].includes(beats)||!Number.isFinite(bpm)||bpm<40||bpm>240)throw Error('Enable beat controls and enter a valid BPM.');
    const beat=60/bpm,start=Math.floor((this.currentTime+1e-6)/beat)*beat,end=start+beats*beat;
    if(end>this.buffer.duration)throw Error('Not enough track remains for that loop.');
    const position=this.currentTime;this.offset=position;this.anchor=this.context().currentTime;this.region=[start,end];this.repeat=true;if(this.voice?.source){this.voice.source.loop=true;this.voice.source.loopStart=start;this.voice.source.loopEnd=end;}this.syncLoop();this.observe('loop');
  }
  beginScratch(){if(!this.processor||this.scratching)throw Error('Enable beat controls first.');this.exitLoop();this.scratchResume=!this.paused;this.offset=this.currentTime;this.play();this.scratching=true;this.scratchSpeed=0;this.send({type:'scratch',speed:0});this.observe('scratch');}
  scratch(speed){if(!this.scratching||!Number.isFinite(speed))return;this.scratchSpeed=Math.max(-4,Math.min(4,speed));this.send({type:'scratch',speed:this.scratchSpeed});this.observe('scratch');}
  endScratch(resume=true){if(!this.scratching)return;const play=resume&&this.scratchResume;this.scratching=false;this.resync=true;this.anchor=this.context().currentTime;this.send({type:'scratch-end'});if(!play)this.pause();this.observe('scratch-end');}
  rollPosition(){return Math.min(this.buffer.duration,this.roll.position+(this.voice?Math.max(0,this.context().currentTime-this.roll.time)*this.speed:0));}
  startRoll(beats,bpm){
    if(this.paused||this.roll||this.repeat)throw Error('Play the track and exit its loop before starting a roll.');
    const position=this.currentTime;this.beatLoop(beats,bpm);this.roll={position,time:this.context().currentTime};this.observe('roll');
  }
  exitLoop(){if(this.roll){const position=this.rollPosition();this.roll=null;this.loop=false;this.region=null;this.currentTime=position;}else{this.loop=false;this.region=null;}this.observe('loop');}
}
