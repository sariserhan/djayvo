const $=id=>document.getElementById(id);
export function distinctOutputs(master,cue){return typeof master==='string'&&typeof cue==='string'&&master.length>0&&cue.length>0&&master!==cue&&![master,cue].some(id=>['default','communications'].includes(id));}
export function attachCueRouting({graph,context,mixer,rights,paused}){
 let player,bus,gains,limiter,testTone,configured=false,busy=false,version=0,originalSink;
 const status=text=>{$('cue-status').textContent=text;};
 function silence(){version++;testTone?.stop();testTone=null;configured=false;$('cue-verified').checked=false;for(const d of ['a','b']){$(`cue-listen-${d}`).checked=false;$(`cue-listen-${d}`).disabled=true;}gains?.forEach(g=>g.gain.value=0);player?.pause();}
 async function release(){silence();player?.srcObject?.getTracks().forEach(t=>t.stop());if(player)player.srcObject=null;player=null;
  if(bus){gains.forEach((gain,i)=>{mixer().strips[i].scope.disconnect(gain);gain.disconnect();});bus.disconnect();limiter.disconnect();bus=null;gains=null;limiter=null;}
  if(context()&&originalSink!==undefined){const sink=originalSink;originalSink=undefined;await context().setSinkId(sink);}
 }
 function update(){for(const [i,d] of ['a','b'].entries())gains?.[i].gain.setTargetAtTime(configured&&rights.checked&&$('cue-verified').checked&&$(`cue-listen-${d}`).checked?Number($('cue-level').value)*.25:0,context().currentTime,.005);}
 for(const kind of ['master','headphone']){const button=$(`cue-choose-${kind}`);button.hidden=!navigator.mediaDevices?.selectAudioOutput;button.onclick=async()=>{silence();try{const device=await navigator.mediaDevices.selectAudioOutput();const select=$(`cue-${kind}-device`);if(![...select.options].some(o=>o.value===device.deviceId))select.add(new Option(device.label||'Selected output',device.deviceId));select.value=device.deviceId;$('cue-connect').disabled=!distinctOutputs($('cue-master-device').value,$('cue-headphone-device').value);status('Choose a different output for the other channel, then configure and test.');}catch(error){status(`Output access was not granted: ${error.message}`);}};}
 $('cue-refresh').onclick=async()=>{try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio?.prototype.setSinkId||!HTMLMediaElement.prototype.setSinkId||!navigator.mediaDevices?.enumerateDevices)throw Error('Separate headphone cue is unavailable in this browser. Single-output mixing still works.');
  const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput'&&!['default','communications',''].includes(d.deviceId));
  for(const id of ['cue-master-device','cue-headphone-device'])$(id).replaceChildren(new Option('Choose output',''),...devices.map((d,i)=>new Option(d.label||`Output ${i+1}`,d.deviceId)));
  $('cue-connect').disabled=devices.length<2;
  status(devices.length<2?'Two distinct audio outputs are required. Connect headphones or an audio interface and grant browser output-device access, then refresh.':'Choose speakers and a different headphone output. Pause both decks before configuring.');
 }catch(error){status(error.message);}};
 for(const id of ['cue-master-device','cue-headphone-device'])$(id).onchange=()=>silence();
 $('cue-connect').onclick=async()=>{
  if(busy)return;
  if(!rights.checked||!paused())return status('Confirm music permission and pause both decks before changing outputs.');
  const master=$('cue-master-device').value,cue=$('cue-headphone-device').value;if(!distinctOutputs(master,cue))return status('Choose two different explicit output devices.');
  busy=true;$('cue-connect').disabled=true;
  try{graph();await release();const token=version,ctx=context();originalSink=ctx.sinkId??'';
   await ctx.setSinkId(master);const audio=new Audio();await audio.setSinkId(cue);
   if(token!==version||!rights.checked)throw Error('Output setup interrupted.');
   player=audio;bus=ctx.createMediaStreamDestination();limiter=ctx.createWaveShaper();limiter.curve=Float32Array.from({length:4097},(_,i)=>.5*Math.tanh(2*(i/2048-1)));limiter.connect(bus);gains=mixer().strips.map(strip=>{const gain=ctx.createGain();gain.gain.value=0;strip.scope.connect(gain);gain.connect(limiter);return gain;});
   player.srcObject=bus.stream;await player.play();if(token!==version||!rights.checked)throw Error('Output setup interrupted.');configured=true;
   status('Route configured. Test headphones, then confirm that only the headphones play the test tone. Cue controls stay muted until you confirm.');
  }catch(error){await release().catch(()=>{});status(`Headphone cue stopped: ${error.message}`);}finally{busy=false;$('cue-connect').disabled=false;}
 };
 $('cue-test').onclick=async()=>{
  if(!configured||!player)return status('Configure two output devices first.');
  const token=version;try{await context().resume();if(token!==version||!rights.checked)return;await player.play();if(token!==version||!rights.checked)return;testTone?.stop();const osc=context().createOscillator(),gain=context().createGain();osc.frequency.value=660;gain.gain.value=.03;osc.connect(gain);gain.connect(bus);testTone=osc;osc.start();osc.stop(context().currentTime+.4);osc.onended=()=>{if(testTone===osc)testTone=null;osc.disconnect();gain.disconnect();};}
  catch{silence();status('Headphone test failed. Configure the outputs again.');}
 };
 $('cue-verified').onchange=()=>{if(!configured)$('cue-verified').checked=false;for(const d of ['a','b'])$(`cue-listen-${d}`).disabled=!configured||!$('cue-verified').checked;update();};
 for(const d of ['a','b'])$(`cue-listen-${d}`).onchange=update;$('cue-level').oninput=update;
 $('cue-disconnect').onclick=()=>release().then(()=>status('Headphone cue disconnected; original master output restored.'),()=>status('Cue is muted. Restore the master output in your browser settings.'));
 navigator.mediaDevices?.addEventListener('devicechange',()=>{silence();status('An audio device changed. Reconfigure and retest headphone cue.');});
 rights.addEventListener('change',()=>{if(!rights.checked)silence();});
 window.addEventListener('pagehide',()=>{void release().catch(()=>{});});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();});
 return {interrupt:silence};
}
