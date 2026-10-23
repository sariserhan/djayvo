import { studioElement as $, studioQuery, onStudioWindow } from './studio-windows.js';

export const PAD_BEATS = [.125, .25, .5, 1, 2, 4, 8, 16];
export function snapToBeat(position, bpm, origin, duration) {
  if (![position,bpm,origin,duration].every(Number.isFinite) || bpm<40 || bpm>240 || duration<=0 || origin<0 || origin>duration) throw Error('Set the track BPM and first beat before quantizing.');
  return Math.max(0, Math.min(duration, origin + Math.round((position-origin)*bpm/60)*60/bpm));
}
export function resizedLoop(region, factor, duration) {
  if (!Array.isArray(region) || region.length!==2 || ![...region,factor,duration].every(Number.isFinite) || region[0]<0 || region[1]<=region[0] || ![.5,2].includes(factor)) throw Error('Set a beat loop first.');
  const end=region[0]+(region[1]-region[0])*factor;
  if (end>duration || end-region[0]<.02) throw Error('That loop size does not fit this track.');
  return [region[0],end];
}
export function waveformPeaks(buffer, bins=1000) {
  const peaks=new Float32Array(Math.min(bins,buffer.length));bins=peaks.length;
  for(let c=0;c<buffer.numberOfChannels;c++){
    const data=buffer.getChannelData(c);
    for(let b=0;b<bins;b++){
      const end=Math.floor((b+1)*data.length/bins);
      for(let i=Math.floor(b*data.length/bins);i<end;i++)peaks[b]=Math.max(peaks[b],Math.abs(data[i]));
    }
  }
  return peaks;
}
const beatName=n=>n===.125?'⅛':n===.25?'¼':n===.5?'½':String(n);
const clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

export function attachProDeckTools({decks,mode,context,prepareFrames,deckEffects}) {
  if(mode==='basic'||location.pathname.startsWith('/academy/')||location.pathname.startsWith('/academy-offline/')||new URLSearchParams(location.search).has('academy'))return {bind(){},refresh(){}};
  document.documentElement.classList.add('studio-pro');
  const overview=document.createElement('section');overview.className='pro-overviews';overview.setAttribute('aria-label','Pro track waveforms');
  overview.innerHTML='<div class="pro-overview-title"><strong>JAMLOOM <span>PRO PERFORMANCE</span></strong><span>Waveforms · cue points · beat grids</span></div>';
  studioQuery('.console').before(overview);
  const states=decks.map(deck=>{
    const id=deck.id,upper=id.toUpperCase(),section=$(`jog-${id}`).closest('.deck');
    const lane=document.createElement('div');lane.className=`pro-wave-lane pro-wave-${id}`;
    lane.innerHTML=`<div class="pro-wave-heading"><strong>DECK ${upper}</strong><span id="pro-track-${id}">Load a track</span><output id="pro-remaining-${id}">—</output></div><canvas id="pro-wave-${id}" width="1400" height="96" role="slider" tabindex="0" aria-label="Deck ${upper} waveform position" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"></canvas><p id="pro-wave-help-${id}">Enable beat controls to see the track waveform. Click or use arrow keys to seek.</p>`;
    overview.append(lane);
    const screen=document.createElement('div');screen.className='pro-jog-screen';screen.setAttribute('aria-hidden','true');
    screen.innerHTML=`<small>DECK ${upper}</small><strong id="pro-bpm-${id}">—</strong><span>BPM</span><output id="pro-position-${id}">0:00</output>`;$(`jog-${id}`).append(screen);
    const tools=document.createElement('div');tools.className='pro-deck-toolbar';
    tools.innerHTML=`<button class="small-button" id="pro-prepare-${id}">Analyze waveform &amp; enable pads</button><button class="small-button" id="pro-quantize-${id}" aria-pressed="false">Quantize cues</button><button class="small-button" id="pro-slip-${id}" aria-pressed="true">Slip reverse</button><button class="small-button pro-reverse" id="pro-reverse-${id}" aria-pressed="false">Hold reverse</button>`;
    section.querySelector('.platter-row').after(tools);
    const tempoRow=$(`bpm-${id}`).closest('.tempo-row');tempoRow.classList.add('pro-tempo');section.querySelector('.deck-display').after(tempoRow);
    const grid=document.createElement('details');grid.className='pro-grid-editor';
    grid.innerHTML=`<summary>Beat grid &amp; loop tools</summary><p>Enter the BPM above. Set the first beat by ear; this grid is manual.</p><div class="pro-grid-controls"><button class="small-button" id="pro-grid-set-${id}">First beat here</button><button class="small-button" id="pro-grid-left-${id}" aria-label="Move Deck ${upper} grid 10 milliseconds earlier">Grid −10 ms</button><button class="small-button" id="pro-grid-right-${id}" aria-label="Move Deck ${upper} grid 10 milliseconds later">Grid +10 ms</button><output id="pro-grid-value-${id}">First beat 0.000 s</output><button class="small-button" id="pro-loop-half-${id}">½ loop</button><button class="small-button" id="pro-loop-double-${id}">2× loop</button><button class="small-button" id="pro-loop-left-${id}">Loop −1 beat</button><button class="small-button" id="pro-loop-right-${id}">Loop +1 beat</button><output id="pro-loop-value-${id}" aria-live="polite">No beat loop</output></div></details>`;
    section.querySelector('.deck-tools').after(grid);
    const hot=section.querySelector('.hotcues');
    for(let i=4;i<8;i++){const button=document.createElement('button');button.id=`hot-${id}-${i}`;button.className='hotcue';button.innerHTML=`${i+1} <small>EMPTY</small>`;button.disabled=true;hot.append(button);}
    const modes=document.createElement('div');modes.className='pro-pad-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label',`Deck ${upper} performance pad mode`);
    for(const [key,label] of [['hot','Hot cue'],['loop','Beat loop'],['roll','Beat roll'],['jump','Beat jump']]){const button=document.createElement('button');button.textContent=label;button.dataset.padMode=key;button.setAttribute('aria-pressed',String(key==='hot'));modes.append(button);}
    hot.before(modes);
    const jump=document.createElement('button');jump.className='small-button pro-jump-direction';jump.id=`pro-jump-direction-${id}`;jump.textContent='Jump forward →';jump.setAttribute('aria-pressed','false');hot.after(jump);jump.hidden=true;
    const echo=document.createElement('label');echo.className='pro-echo-sync';echo.innerHTML=`Echo timing<select id="pro-echo-sync-${id}" aria-label="Deck ${upper} echo timing"><option value="manual">Manual</option><option value="0.25">¼ beat</option><option value="0.5">½ beat</option><option value="1">1 beat</option></select>`;section.querySelector('.deck-effects').append(echo);
    const meter=document.createElement('label');meter.className='pro-channel-meter';meter.innerHTML=`${upper} · PRE-FADER<meter id="pro-meter-${id}" min="0" max="1" value="0" aria-label="Deck ${upper} pre-fader peak"></meter>`;studioQuery(`.channel-${id}`).append(meter);
    return {deck,section,modes,hot,mode:'hot',rollPad:null,direction:1,slip:true,reverse:null,buffer:null,file:null,peaks:null,meter:new Float32Array(2048),echoMs:null};
  });
  const fail=(id,error)=>{$(`error-${id}`).textContent=error.message;};
  const tempo=deck=>{const bpm=Number($(`bpm-${deck.id}`).value);if(!Number.isFinite(bpm)||bpm<40||bpm>240)throw Error('Enter a BPM between 40 and 240 first.');return bpm;};
  const ready=deck=>!!deck.url&&!deck.loading&&!deck.prepared&&!deck.preparing&&!deck.starting;
  function stopReverse(state){
    const held=state.reverse;if(!held)return;state.reverse=null;clearInterval(held.timer);
    const audio=state.deck.audio;
    if(audio.scratching){audio.endScratch();if(state.slip&&held.file===state.deck.file)audio.currentTime=Math.min(state.deck.duration,held.position+(context().currentTime-held.time)*held.rate);}
    $(`pro-reverse-${state.deck.id}`).setAttribute('aria-pressed','false');
  }
  function labels(state){
    const id=state.deck.id;
    state.modes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.padMode===state.mode)));
    $(`pro-jump-direction-${id}`).hidden=state.mode!=='jump';
    const cues=state.deck.transportState?.().hot??[];
    [...state.hot.children].forEach((button,i)=>{
      const label=state.mode==='hot'?(cues[i]==null?'EMPTY':`${cues[i].toFixed(1)} s`):state.mode==='jump'?`${state.direction<0?'−':'+'}${beatName(PAD_BEATS[i])}`:`${beatName(PAD_BEATS[i])} BEATS`;
      button.innerHTML=`${i+1}<small>${label}</small>`;
      button.setAttribute('aria-label',`Deck ${id.toUpperCase()} ${state.mode} pad ${i+1}: ${label}`);
      button.dataset.set=String(state.mode==='hot'&&cues[i]!=null);
    });
    state.hot.dataset.mode=state.mode;
    state.section.querySelector('.pad-help').textContent=state.mode==='hot'?'Click empty to set · Shift-click to clear · Quantize follows your grid':state.mode==='roll'?'Play, then tap a pad to roll. Tap it again or Exit loop to return to the song timeline.':state.mode==='jump'?'Choose a distance, then jump forward or backward.':'Tap a size to loop from this beat. Use Exit loop to continue.';
  }
  function bind(){for(const state of states){
    const {deck}=state,id=deck.id,audio=deck.audio;
    const act=fn=>()=>{try{if(!ready(deck)||state.reverse)return;fn();fail(id,{message:''});}catch(e){fail(id,e);}};
    $(`pro-prepare-${id}`).onclick=()=>prepareFrames(deck);
    $(`pro-quantize-${id}`).onclick=act(()=>{if(!deck.quantize)tempo(deck);deck.quantize=!deck.quantize;});
    $(`pro-slip-${id}`).onclick=()=>{if(!state.reverse)state.slip=!state.slip;};
    $(`pro-grid-set-${id}`).onclick=act(()=>{deck.gridOrigin=audio.currentTime;});
    for(const [name,delta] of [['left',-.01],['right',.01]])$(`pro-grid-${name}-${id}`).onclick=act(()=>{deck.gridOrigin=Math.max(0,Math.min(deck.duration,(deck.gridOrigin??0)+delta));});
    for(const [name,factor] of [['half',.5],['double',2]])$(`pro-loop-${name}-${id}`).onclick=act(()=>{if(audio.roll)throw Error('Exit the roll first.');audio.setLoopRegion(...resizedLoop(audio.region,factor,deck.duration));});
    for(const [name,sign] of [['left',-1],['right',1]])$(`pro-loop-${name}-${id}`).onclick=act(()=>{if(!audio.region||audio.roll)throw Error('Set a beat loop first.');const delta=sign*60/tempo(deck);audio.setLoopRegion(audio.region[0]+delta,audio.region[1]+delta);audio.currentTime=audio.region[0];});
    state.modes.querySelectorAll('button').forEach(button=>button.onclick=()=>{state.mode=button.dataset.padMode;labels(state);refresh();});
    $(`pro-jump-direction-${id}`).onclick=()=>{state.direction*=-1;$(`pro-jump-direction-${id}`).textContent=state.direction===1?'Jump forward →':'← Jump backward';$(`pro-jump-direction-${id}`).setAttribute('aria-pressed',String(state.direction<0));labels(state);};
    [...state.hot.children].forEach((button,i)=>{const hot=button.onclick;button.onclick=event=>{
      if(!ready(deck)||state.reverse)return;
      if(state.mode==='hot'){try{hot(event);labels(state);}catch(e){fail(id,e);}return;}
      try{
        const bpm=tempo(deck),beats=PAD_BEATS[i];
        if(state.mode==='jump')audio.currentTime=Math.max(0,Math.min(deck.duration,audio.currentTime+state.direction*beats*60/bpm));
        else if(state.mode==='loop'){audio.exitLoop();audio.beatLoop(beats,bpm,deck.gridOrigin??0);}
        else if(audio.roll&&state.rollPad===i){audio.exitLoop();state.rollPad=null;}else{if(audio.roll)audio.exitLoop();audio.startRoll(beats,bpm,deck.gridOrigin??0);state.rollPad=i;}
        fail(id,{message:''});
      }catch(e){fail(id,e);}
    };});
    const reverse=$(`pro-reverse-${id}`);
    function begin(){
      if(!ready(deck)||state.reverse||!audio.processor||audio.paused)return;
      try{
        const held=state.reverse={file:deck.file,position:audio.currentTime,time:context().currentTime,rate:audio.playbackRate};
        audio.beginScratch();audio.scratch(-held.rate);
        held.timer=setInterval(()=>{if(!ready(deck)||held.file!==deck.file||!audio.scratching||audio.paused)stopReverse(state);else audio.scratch(-held.rate);},30);
        reverse.setAttribute('aria-pressed','true');
      }catch(e){stopReverse(state);fail(id,e);}
    }
    reverse.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();reverse.focus();reverse.setPointerCapture(event.pointerId);begin();};
    reverse.onkeydown=event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)begin();}};
    reverse.onkeyup=event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();stopReverse(state);}};
    for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])reverse.addEventListener(name,()=>stopReverse(state));
    onStudioWindow(w => {
      const release=()=>stopReverse(state);
      for(const name of ['blur','pagehide'])w.addEventListener(name,release);
      return ()=>{release();for(const name of ['blur','pagehide'])w.removeEventListener(name,release);};
    });
    audio.addEventListener('pause',()=>stopReverse(state));
    const canvas=$(`pro-wave-${id}`);
    const seek=position=>{if(!ready(deck)||state.reverse||!audio.buffer)return;audio.currentTime=deck.quantize?snapToBeat(position,tempo(deck),deck.gridOrigin??0,deck.duration):Math.max(0,Math.min(deck.duration,position));};
    canvas.onclick=event=>{try{const r=canvas.getBoundingClientRect();seek((event.clientX-r.left)/r.width*deck.duration);}catch(e){fail(id,e);}};
    canvas.onkeydown=event=>{let target;if(event.key==='Home')target=0;else if(event.key==='End')target=deck.duration;else if(['ArrowLeft','ArrowRight'].includes(event.key))target=audio.currentTime+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?10:1);else return;event.preventDefault();try{seek(target);}catch(e){fail(id,e);}};
    $(`pro-echo-sync-${id}`).onchange=()=>{deck.echoDivision=$(`pro-echo-sync-${id}`).value;state.echoMs=null;refresh();};
    labels(state);
  }}
  let lastDraw=0;
  function refresh(){for(const state of states){
    const {deck}=state,id=deck.id,audio=deck.audio,available=ready(deck),buffered=available&&!!audio.buffer;
    if(state.file!==deck.file){stopReverse(state);state.file=deck.file;state.buffer=null;state.peaks=null;state.echoMs=null;state.mode='hot';labels(state);}
    if(audio.buffer&&state.buffer!==audio.buffer){state.buffer=audio.buffer;state.peaks=waveformPeaks(audio.buffer);}
    for(const name of ['prepare','quantize','grid-set','grid-left','grid-right'])$(`pro-${name}-${id}`).disabled=!available||!!state.reverse;
    $(`pro-prepare-${id}`).disabled||=!!audio.buffer||!audio.paused;$(`pro-prepare-${id}`).hidden=!!audio.buffer;
    $(`pro-prepare-${id}`).textContent=audio.buffer?'Waveform ready':'Analyze waveform & enable pads';
    for(const name of ['half','double','left','right'])$(`pro-loop-${name}-${id}`).disabled=!buffered||!audio.region||!!audio.roll||!!state.reverse;
    $(`pro-reverse-${id}`).disabled=!buffered||!audio.processor||audio.paused;
    $(`pro-slip-${id}`).setAttribute('aria-pressed',String(state.slip));$(`pro-quantize-${id}`).setAttribute('aria-pressed',String(!!deck.quantize));
    $(`pro-loop-value-${id}`).textContent=audio.region?`${audio.roll?'Roll':'Loop'} ${(audio.region[1]-audio.region[0]).toFixed(3)} s`:'No beat loop';
    $(`pro-grid-value-${id}`).textContent=`First beat ${(deck.gridOrigin??0).toFixed(3)} s`;
    const bpm=Number($(`bpm-${id}`).value),validBpm=bpm>=40&&bpm<=240;
    $(`pro-bpm-${id}`).textContent=validBpm?(bpm*audio.playbackRate).toFixed(1):'—';
    $(`pro-position-${id}`).textContent=clock(audio.currentTime||0);
    state.section.querySelector('.jog-help').textContent=audio.processor?'Drag the platter to scratch · release to resume':'Drag to seek · Analyze waveform to enable scratching';
    $(`pro-track-${id}`).textContent=deck.file?.name??'Load a track';$(`pro-remaining-${id}`).textContent=deck.duration?`−${clock(Math.max(0,deck.duration-audio.currentTime))}`:'—';
    for(const [i,button] of [...state.hot.children].entries()){
      button.disabled=!available||!!state.reverse||(state.mode!=='hot'&&(!buffered||!validBpm))||(state.mode==='roll'&&audio.paused);
      button.setAttribute('aria-pressed',String(state.mode==='roll'&&!!audio.roll&&state.rollPad===i||state.mode==='loop'&&!audio.roll&&!!audio.region&&Math.abs((audio.region[1]-audio.region[0])*bpm/60-PAD_BEATS[i])<.001));
    }
    const division=deck.echoDivision??'manual';$(`pro-echo-sync-${id}`).value=division;
    $(`delay-${id}`).disabled=division!=='manual'||!available;
    if(division!=='manual'&&available&&validBpm){
      const milliseconds=60000/(bpm*audio.playbackRate)*Number(division);
      if(milliseconds<100||milliseconds>800){deck.echoDivision='manual';$(`pro-echo-sync-${id}`).value='manual';fail(id,{message:'This beat division exceeds the echo range. Choose another division.'});}
      else if(milliseconds!==state.echoMs){state.echoMs=milliseconds;$(`delay-${id}`).value=String(Math.round(milliseconds));deckEffects(deck);}
    }
    const meter=$(`pro-meter-${id}`);state.meter.fill(0);if(context()?.state==='running')deck.proScope?.getFloatTimeDomainData(state.meter);meter.value=state.meter.reduce((peak,n)=>Math.max(peak,Math.abs(n)),0);
  }
  if(performance.now()-lastDraw<80)return;lastDraw=performance.now();for(const state of states)draw(state);
  }
  function draw(state){
    const {deck,peaks}=state,canvas=$(`pro-wave-${deck.id}`),paint=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    paint.clearRect(0,0,w,h);paint.fillStyle='#080d14';paint.fillRect(0,0,w,h);
    canvas.setAttribute('aria-disabled',String(!ready(deck)||!peaks));canvas.setAttribute('aria-valuemax',String(deck.duration));canvas.setAttribute('aria-valuenow',String(deck.audio.currentTime||0));canvas.setAttribute('aria-valuetext',`${clock(deck.audio.currentTime||0)} of ${clock(deck.duration)}`);
    $(`pro-wave-help-${deck.id}`).textContent=peaks?'Click to seek · arrow keys move 1 second · Shift moves 10 seconds':'Enable beat controls to see the track waveform. Tracks up to 5 minutes / 128 MB decoded.';
    if(!peaks)return;
    const duration=deck.duration,x=s=>s/duration*w,position=deck.audio.currentTime,color=deck.id==='a'?'#ffbf69':'#70d7ef';
    const bpm=Number($(`bpm-${deck.id}`).value);if(bpm>=40&&bpm<=240){const beat=60/bpm,origin=deck.gridOrigin??0;paint.fillStyle='#f4f8ff18';for(let t=origin%(beat*4);t<duration;t+=beat*4)paint.fillRect(x(t),0,1,h);}
    if(deck.audio.region){paint.fillStyle='#bda2ff35';paint.fillRect(x(deck.audio.region[0]),0,x(deck.audio.region[1]-deck.audio.region[0]),h);}
    paint.fillStyle=color;for(let i=0;i<peaks.length;i++){const amplitude=Math.min(1,peaks[i])*h*.48;paint.globalAlpha=i/peaks.length*duration<position ? .45 : 1;paint.fillRect(i/peaks.length*w,h/2-amplitude,Math.max(1,w/peaks.length),amplitude*2||1);}paint.globalAlpha=1;
    const cues=deck.transportState?.().hot??[];paint.font='bold 15px monospace';cues.forEach((cue,i)=>{if(cue==null)return;paint.fillStyle='#f4f8ff';paint.fillRect(x(cue),0,2,18);paint.fillText(String(i+1),Math.min(w-16,x(cue)+4),14);});
    paint.fillStyle='#fff';paint.fillRect(x(position)-1,0,3,h);
  }
  return {bind,refresh};
}
