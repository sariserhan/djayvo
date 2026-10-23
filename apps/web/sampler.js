import {trackDuration} from './mixer.js';
import {resumeAudio} from './audio.js';
const $=id=>document.getElementById(id);
export function validSampleSettings(s,duration){return !!s&&Number.isFinite(duration)&&duration>0&&duration<=30.01&&Number.isFinite(s.start)&&s.start>=0&&Number.isFinite(s.end)&&s.end<=duration&&s.end-s.start>=.02&&Number.isFinite(s.level)&&s.level>=0&&s.level<=1&&Number.isInteger(s.pitch)&&s.pitch>=-12&&s.pitch<=12&&typeof s.loop==='boolean';}
export function trimSample(context,buffer,start,end){
 const first=Math.round(start*buffer.sampleRate),last=Math.min(buffer.length,Math.round(end*buffer.sampleRate)),length=last-first;
 if(!Number.isSafeInteger(first)||first<0||!Number.isSafeInteger(length)||length<2||last>buffer.length)throw Error('Invalid sample trim.');
 const result=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate),fade=Math.min(Math.floor(length/2),Math.round(buffer.sampleRate*.003));
 for(let channel=0;channel<buffer.numberOfChannels;channel++){const samples=result.getChannelData(channel);samples.set(buffer.getChannelData(channel).subarray(first,last));for(let i=0;i<fade;i++){samples[i]*=i/fade;samples[length-1-i]*=i/fade;}}
 return result;
}
async function bankStore(mode,action){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('jamloom-sampler-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('banks');r.onsuccess=()=>resolve(r.result);r.onerror=r.onblocked=()=>reject(Error('Sample storage unavailable.'));});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('banks',mode),result=action(tx.objectStore('banks'));tx.oncomplete=()=>resolve(result?.result);tx.onerror=tx.onabort=()=>reject(Error('Could not save this bank. The previous saved bank is kept.'));});}finally{db.close();}
}
export function attachSampler({graph,context,mixer,onSourcesChanged}){
 let selected=0,slots=Array(8).fill(null),voices=new Map(),revision=0,busy=false;
 const status=text=>$('sampler-status').textContent=text;
 const permitted=()=>$('sample-consent').checked;
 const pads=Array.from({length:8},(_,i)=>{const button=document.createElement('button');button.className='sample-pad';button.id=`sample-pad-${i}`;button.innerHTML=`<strong>${i+1}</strong> <small>Load sample</small>`;button.onclick=()=>{selected=i;refresh();void play(i);};button.setAttribute('aria-label',`Sample pad ${i+1}`);$('sample-pads').append(button);return button;});
 function refresh(){
  pads.forEach((pad,i)=>{pad.setAttribute('aria-pressed',String(i===selected));pad.dataset.playing=String(voices.has(i));const name=slots[i]?.file.name??'Empty';pad.querySelector('small').textContent=name;pad.setAttribute('aria-label',`${i+1} ${name} — Sample pad`);pad.disabled=!permitted()||busy;});
  const slot=slots[selected];$('sample-selected').textContent=`Pad ${selected+1}${slot?' · '+slot.file.name:''}`;
  for(const key of ['start','end','pitch','level','loop']){const input=$('sample-'+key);input.disabled=!slot||!permitted()||busy;if(slot){if(key==='loop')input.checked=slot.settings[key];else input.value=String(slot.settings[key]);}}
  $('sample-file').disabled=!permitted()||busy;$('sample-clear').disabled=!slot||busy;
  for(const id of ['sample-save','sample-restore'])$(id).disabled=busy||!permitted();
  $('sample-delete-bank').disabled=busy;
 }
 function stop(i){const voice=voices.get(i);if(!voice)return;voices.delete(i);const now=context().currentTime;mixer().automationTrace?.append({kind:'sample_stop',pad:i,context_frame:Math.round(now*context().sampleRate)});voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.003);voice.source.stop(now+.02);refresh();}
 function stopAll(){revision++;for(const i of [...voices.keys()])stop(i);}
 async function play(i){
  if(!permitted()||busy||!slots[i])return;
  if(voices.has(i)){stop(i);return;}
  const token=revision,slot=slots[i];
  try{graph();await resumeAudio(context());if(token!==revision||!permitted()||slots[i]!==slot||voices.has(i))return;
   const s=slot.settings;if(!validSampleSettings(s,slot.buffer.duration))throw Error('Choose a valid trim inside the sample.');
   const ctx=context(),source=ctx.createBufferSource(),gain=ctx.createGain();
   if(slot.rendered?.start!==s.start||slot.rendered?.end!==s.end)slot.rendered={start:s.start,end:s.end,buffer:trimSample(ctx,slot.buffer,s.start,s.end)};
   source.buffer=slot.rendered.buffer;source.playbackRate.value=2**(s.pitch/12);source.loop=s.loop;
   gain.gain.value=0;gain.gain.setTargetAtTime(s.level*.35,ctx.currentTime,.003);source.connect(gain);gain.connect(mixer().rackFX.input);
   const started=ctx.currentTime;const voice={source,gain,started_context_frame:Math.round(started*ctx.sampleRate),settings:{...s},duration:slot.buffer.duration};voices.set(i,voice);source.onended=()=>{source.disconnect();gain.disconnect();if(voices.get(i)===voice)voices.delete(i);refresh();};
   source.start(started);mixer().automationTrace?.append({kind:'sample_start',pad:i,context_frame:voice.started_context_frame,settings:{...s},duration:slot.buffer.duration});refresh();status(`Playing pad ${i+1}${s.loop?' · tap again to stop':''}. Sample volume also follows the instruments level and master.`);
  }catch(error){status(error.message);}
 }
 async function decode(file){
  if(!(file instanceof Blob)||!file.size||file.size>8*1024*1024||file.jamloomOnlineOnly)throw Error('Choose a local sample up to 30 seconds and 8 MB.');
  const duration=await trackDuration(file,new AbortController().signal);if(duration>30.01||duration<.02)throw Error('Choose a sample between 0.02 and 30 seconds.');
  graph();const buffer=await context().decodeAudioData(await file.arrayBuffer());
  if(buffer.duration>30.01||buffer.numberOfChannels>2)throw Error('Use a mono or stereo sample up to 30 seconds.');
  for(let i=0;i<buffer.numberOfChannels;i++)if(!buffer.getChannelData(i).every(Number.isFinite))throw Error('Invalid sample audio.');
  return buffer;
 }
 async function loadSample(file){
  const index=selected;if(!file||!permitted()||busy)return;
  const token=++revision;busy=true;refresh();
  try{const buffer=await decode(file);if(token!==revision||!permitted())return;stop(index);slots[index]={file,buffer,settings:{start:0,end:buffer.duration,pitch:0,level:.8,loop:false}};onSourcesChanged();status(`Loaded pad ${index+1}. Tap its pad to play. Drag trim or change pitch below.`);}catch(error){status(error.message);}finally{busy=false;refresh();}
 };
 $('sample-file').onchange=event=>{const file=event.target.files?.[0];event.target.value='';return loadSample(file);};
 for(const key of ['start','end','pitch','level','loop'])$('sample-'+key).onchange=()=>{
  const slot=slots[selected];if(!slot)return;const next={...slot.settings,[key]:key==='loop'?$('sample-loop').checked:Number($('sample-'+key).value)};
  if(!validSampleSettings(next,slot.buffer.duration)){status('Trim must stay inside the sample and leave at least 0.02 seconds.');refresh();return;}
  stop(selected);slot.settings=next;status('Pad updated. Tap it to play.');
 };
 $('sample-stop').onclick=stopAll;
 $('sample-clear').onclick=()=>{if(busy)return;stop(selected);slots[selected]=null;onSourcesChanged();refresh();status('Pad cleared here. Saved banks are unchanged.');};
 $('sample-save').onclick=async()=>{
  if(busy||!permitted())return;if(!$('sample-store-consent').checked)return status('Confirm saving permission before saving this bank.');
  busy=true;refresh();const bank=$('sample-bank').value;
  try{await bankStore('readwrite',store=>store.put({version:1,slots:slots.map(slot=>slot?{file:slot.file,settings:slot.settings}:null)},bank));status(`Bank ${bank} saved on this device. It includes the sample audio.`);}catch(error){status(error.message);}finally{busy=false;refresh();}
 };
 $('sample-restore').onclick=async()=>{
  if(busy||!permitted())return;stopAll();const token=revision;busy=true;refresh();
  try{const saved=await bankStore('readonly',store=>store.get($('sample-bank').value));if(!saved)return status('This bank is empty.');
   if(saved.version!==1||!Array.isArray(saved.slots)||saved.slots.length!==8)throw Error('Saved bank is damaged.');
   const next=[];for(const slot of saved.slots){if(token!==revision||!permitted())return;if(!slot){next.push(null);continue;}const buffer=await decode(slot.file);if(!validSampleSettings(slot.settings,buffer.duration))throw Error('Saved sample settings are damaged.');next.push({...slot,buffer});}
   if(token!==revision||!permitted())return;slots=next;onSourcesChanged();status('Bank restored, stopped. Tap a pad to play.');
  }catch(error){status(error.message+' Current pads kept.');}finally{busy=false;refresh();}
 };
 $('sample-delete-bank').onclick=async()=>{if(busy)return;busy=true;refresh();try{await bankStore('readwrite',store=>store.delete($('sample-bank').value));status('Saved bank deleted. Loaded pads are unchanged.');}catch(error){status(error.message);}finally{busy=false;refresh();}};
 for(const consent of [$('sample-consent')])consent.addEventListener('change',()=>{if(!permitted()){stopAll();slots.fill(null);onSourcesChanged();status('Samples cleared from this session. Delete saved banks separately.');}refresh();});
 window.addEventListener('pagehide',stopAll);window.addEventListener('blur',stopAll);
 refresh();return {loadSample,stop:stopAll,snapshot:()=>[...voices].map(([pad,v])=>({pad,started_context_frame:v.started_context_frame,settings:{...v.settings},duration:v.duration})),sources:()=>Object.fromEntries(slots.map((slot,i)=>['sample'+i,slot?.file??null]))};
}
