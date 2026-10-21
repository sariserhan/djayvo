// Course buffers share the mixer clock. Ordinary imported media keeps its native decoder.
export class FrameDeck extends EventTarget {
  constructor(media, context, destination) {
    super(); this.media=media; this.context=context; this.destination=destination;
    this.buffer=null; this.voice=null; this.offset=0; this.anchor=0; this.speed=1; this.repeat=false; this.region=null;
    for(const event of ['play','pause','ended','timeupdate','loadedmetadata','error'])media.addEventListener(event,()=>{if(!this.buffer)this.dispatchEvent(new Event(event));});
  }
  useBuffer(buffer){this.pause();this.media.removeAttribute('src');this.media.load();this.buffer=buffer;this.offset=0;this.speed=1;this.region=null;this.repeat=false;this.dispatchEvent(new Event('loadedmetadata'));}
  get currentTime(){
    if(!this.buffer)return this.media.currentTime;
    const value=this.offset+(this.voice?Math.max(0,this.context().currentTime-this.anchor)*this.speed:0);
    if(this.repeat){const [start,end]=this.region??[0,this.buffer.duration];return value>=end?start+(value-start)%(end-start):value;}
    return Math.min(value,this.buffer.duration);
  }
  set currentTime(value){if(!this.buffer){this.media.currentTime=value;return;}if(!Number.isFinite(value))throw Error('Invalid seek');const playing=!!this.voice;this.release();this.offset=Math.max(0,Math.min(value,this.buffer.duration));if(playing)this.play();}
  get paused(){return this.buffer?!this.voice:this.media.paused;}
  get ended(){return this.buffer?!this.repeat&&this.currentTime>=this.buffer.duration:this.media.ended;}
  get playbackRate(){return this.buffer?this.speed:this.media.playbackRate;}
  set playbackRate(value){if(!this.buffer){this.media.playbackRate=value;return;}if(!Number.isFinite(value)||value<.84||value>1.16)throw Error('Invalid playback rate');this.offset=this.currentTime;this.anchor=this.context().currentTime;this.speed=value;this.voice?.source.playbackRate.setValueAtTime(value,this.anchor);}
  get readyState(){return this.buffer?4:this.media.readyState;} get seeking(){return this.buffer?false:this.media.seeking;} get error(){return this.buffer?null:this.media.error;}
  get src(){return this.media.src;} set src(value){this.pause();this.buffer=null;this.media.src=value;}
  get preservesPitch(){return this.buffer?false:this.media.preservesPitch;} set preservesPitch(value){this.media.preservesPitch=value;}
  get loop(){return this.buffer?this.repeat:this.media.loop;} set loop(value){if(!this.buffer){this.media.loop=value;return;}this.offset=this.currentTime;this.anchor=this.context().currentTime;this.repeat=!!value;if(this.voice){this.voice.source.loop=this.repeat;[this.voice.source.loopStart,this.voice.source.loopEnd]=this.region??[0,this.buffer.duration];}}
  removeAttribute(name){if(name==='src'){this.pause();this.buffer=null;this.region=null;}this.media.removeAttribute(name);}
  load(){this.media.load();}
  release(){if(!this.voice)return;const voice=this.voice;this.voice=null;const now=this.context().currentTime;voice.source.onended=null;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.005);voice.source.stop(now+.005);voice.source.onended=()=>{voice.source.disconnect();voice.gain.disconnect();};}
  play(){
    if(!this.buffer)return this.media.play();if(this.voice)return Promise.resolve();
    const ctx=this.context();if(this.ended)this.offset=0;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=this.buffer;source.playbackRate.value=this.speed;source.loop=this.repeat;
    [source.loopStart,source.loopEnd]=this.region??[0,this.buffer.duration];source.connect(gain);gain.connect(this.destination());
    this.anchor=Math.ceil(ctx.currentTime*ctx.sampleRate)/ctx.sampleRate;gain.gain.setValueAtTime(0,this.anchor);gain.gain.linearRampToValueAtTime(1,this.anchor+.005);
    const voice=this.voice={source,gain};source.onended=()=>{source.disconnect();gain.disconnect();if(this.voice!==voice)return;this.voice=null;this.offset=this.buffer.duration;this.dispatchEvent(new Event('ended'));};
    source.start(this.anchor,this.offset);this.dispatchEvent(new Event('play'));return Promise.resolve();
  }
  pause(){if(!this.buffer){this.media.pause();return;}const playing=!!this.voice;this.offset=this.currentTime;this.release();if(playing)this.dispatchEvent(new Event('pause'));}
  beatLoop(beats,bpm){
    if(!this.buffer||![1,2,4,8,16,32].includes(beats)||!Number.isFinite(bpm)||bpm<40||bpm>240)throw Error('Load course audio and enter a valid BPM.');
    const beat=60/bpm,start=Math.floor((this.currentTime+1e-6)/beat)*beat,end=start+beats*beat;
    if(end>this.buffer.duration)throw Error('Not enough track remains for that loop.');
    const position=this.currentTime;this.offset=position;this.anchor=this.context().currentTime;this.region=[start,end];this.repeat=true;if(this.voice){this.voice.source.loop=true;this.voice.source.loopStart=start;this.voice.source.loopEnd=end;}
  }
  exitLoop(){this.loop=false;this.region=null;}
}
