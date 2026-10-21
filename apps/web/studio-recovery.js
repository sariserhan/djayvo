import {validPattern} from './step-sequence.js';
const $=id=>document.getElementById(id);
const MAX_BYTES=100*1024*1024;
const ranges={crossfade:[0,1],master:[0,1],...Object.fromEntries(['a','b'].flatMap(d=>[
 [`level-${d}`,[0,1]],[`tone-${d}`,[0,100]],[`echo-${d}`,[0,.5]],[`delay-${d}`,[100,800]],
 ...[0,1,2].map(b=>[`eq-${d}-${b}`,[-12,12]])]))};
const extended={'rack-level':[0,1],'rack-tone':[0,100],'rack-echo':[0,.5],'rack-delay':[100,800],patch:[0,12],velocity:[1,127],mouth:[0,1],
 'c-level':[0,1],'tone-c':[0,100],'echo-c':[0,.5],'delay-c':[100,800],
 ...Object.fromEntries(['a','b'].flatMap(d=>['reverb','phaser','flanger'].map(name=>[`${name}-${d}`,[0,.5]])))};
const bounded=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export function validateRecovery(state){
 if(![1,2].includes(state?.version)||!Array.isArray(state.decks)||state.decks.length!==2||
  !['linear','smooth','cut'].includes(state.curve)||!state.values||
  !Object.entries(ranges).every(([id,[min,max]])=>bounded(state.values[id],min,max)))throw Error('Saved controls are damaged.');
 if(state.version===2&&(!Object.entries(extended).every(([id,[min,max]])=>bounded(state.values[id],min,max))||
  !Number.isInteger(state.root)||!bounded(state.root,24,96)||state.root%12!==0||!Number.isInteger(state.values.patch)||!Number.isInteger(state.values.velocity)||!['manual','eighth','dotted','triplet'].includes(state.echoGrid)))throw Error('Saved effects are damaged.');
 for(const d of state.decks){
  if(!d)continue;
  if(!/^[a-f0-9]{64}$/.test(d.sha)||!bounded(d.duration,0,1200)||!bounded(d.position,0,d.duration)||
   !bounded(d.rate,.84,1.16)||typeof d.buffered!=='boolean'||typeof d.loop!=='boolean'||typeof d.keylock!=='boolean'||
   !(d.bpm===''||bounded(Number(d.bpm),40,240))||!bounded(d.cue,0,d.duration)||!Array.isArray(d.hot)||d.hot.length!==4||
   !d.hot.every(n=>n===null||bounded(n,0,d.duration))||
   !(d.region===null||d.buffered&&Array.isArray(d.region)&&d.region.length===2&&bounded(d.region[0],0,d.duration)&&bounded(d.region[1],d.region[0]+.001,d.duration)))throw Error('Saved deck is damaged.');
 }
 if(state.sequence&&!validPattern(state.sequence))throw Error('Saved sequence is damaged.');
 const p=state.performance;
 if(p){
  if(state.version!==2||typeof p.prepared!=='boolean'||typeof p.confirmed!=='boolean'||!p.context||
   !bounded(p.context.tempo,60000,180000)||!Number.isInteger(p.context.tempo)||!Number.isInteger(p.context.tonic)||!bounded(p.context.tonic,60,71)||
   !['minor','major'].includes(p.context.mode)||!bounded(p.downbeat,0,state.decks[0]?.duration??0)||
   (p.prepared&&!state.decks[0])||(p.phrase!==null&&(!(p.phrase instanceof ArrayBuffer)||p.phrase.byteLength>480044||!p.phrase.byteLength||!/^[a-f0-9]{64}$/.test(p.phraseSha)))||
   (p.performance!==null&&(!p.prepared||!p.confirmed||!Array.isArray(p.performance.files)||p.performance.files.length!==4||
     p.performance.files.some(f=>!f||!(f.bytes instanceof ArrayBuffer)||f.bytes.byteLength>8000000||!f.bytes.byteLength))))throw Error('Saved performance is damaged.');
 }
 return state;
}
async function transaction(mode,action){
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('jamloom-studio-recovery-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('session');request.onsuccess=()=>resolve(request.result);
  request.onerror=request.onblocked=()=>reject(Error('Session storage is unavailable.'));});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('session',mode),result=action(tx.objectStore('session'));
  tx.oncomplete=()=>resolve(result?.result);tx.onabort=tx.onerror=()=>reject(Error('Session storage is full or unavailable. The last saved set is kept.'));});}finally{db.close();}
}
export function attachStudioRecovery({decks,rights,loadTrack,prepareFrames,levels,deckEffects,controls,session,keyboard}){
 let busy=false,cache=new WeakMap();
 const status=text=>{$('recovery-status').textContent=text;};
 const sceneKey=()=>`scene-${$('scene-slot').value}`;
 async function save(key='recovery'){
  if(busy||!$('remember-set').checked||!rights.checked||decks.some(d=>d.loading||d.starting||d.preparing||d.audio.scratching))return;
  busy=true;
  try{
   const files=decks.map(d=>d.file),stored=[];
   if(files.some(file=>file?.jamloomOnlineOnly))throw Error('Aurowall partner tracks are online only and cannot be saved for set recovery. Your previous saved set is kept.');
   if(files.reduce((n,f)=>n+(f?.size??0),0)>MAX_BYTES)throw Error('Set recovery supports up to 100 MB. Download recordings separately.');
   for(const file of files){
    if(!file){stored.push(null);continue;}
    if(!cache.has(file)){const bytes=await file.arrayBuffer();cache.set(file,{name:file.name,type:file.type,bytes,sha:await digest(bytes)});}
    stored.push(cache.get(file));
   }
   const performance=await session.recoverySnapshot();
   const total=stored.reduce((n,f)=>n+(f?.bytes.byteLength??0),0)+(performance?.phrase?.byteLength??0)+(performance?.performance?.files.reduce((n,f)=>n+f.bytes.byteLength,0)??0);
   if(total>MAX_BYTES)throw Error('Complete set exceeds 100 MB. The previous saved set is kept.');
   if(!session.recoveryCurrent(performance)||!$('remember-set').checked||!rights.checked||files.some((file,i)=>file!==decks[i].file))return;
   const state=validateRecovery({version:2,performance,root:keyboard.recoveryRoot(),sequence:keyboard.recoveryPattern(),echoGrid:$('echo-grid-c').value,curve:$('crossfade-curve').value,values:Object.fromEntries(Object.keys({...ranges,...extended}).map(id=>[id,Number($(id).value)])),
    decks:decks.map((d,i)=>d.file?{sha:stored[i].sha,duration:d.duration,position:d.audio.roll?d.audio.rollPosition():d.audio.currentTime,rate:d.audio.playbackRate,
     buffered:!!d.audio.buffer,loop:!!d.loop,keylock:$(`keylock-${d.id}`).checked,bpm:$(`bpm-${d.id}`).value,
     region:d.audio.roll?null:d.audio.region??null,...d.transportState()}:null)});
   await transaction('readwrite',store=>{store.put({state,files:stored},key);if(key==='recovery')for(const legacy of ['state','0','1'])store.delete(legacy);});
   status(key==='recovery'?'Set recovery saved on this device. Playback will restore paused.':'Scene saved on this device. Recovery and other scenes are unchanged.');
  }catch(error){status(error.message);}finally{busy=false;}
 }
 const tick=()=>save();
 let timer=setInterval(tick,5000);
 $('remember-set').onchange=()=>{if($('remember-set').checked)tick();else status('Automatic saving stopped. Delete the saved sets to remove their audio.');};
 $('recovery-save').onclick=tick;
 $('scene-save').onclick=()=>{if(!$('remember-set').checked)return status('Confirm device saving permission first.');return save(sceneKey());};
 async function remove(key){
  if(busy)return status('Wait for the current save or restore, then delete the saved set.');
  busy=true;if(key==='recovery')$('remember-set').checked=false;
  try{await transaction('readwrite',store=>{store.delete(key);if(key==='recovery')for(const old of ['state','0','1'])store.delete(old);});status('Saved set and its local audio deleted. Loaded decks are unchanged.');}catch(error){status(error.message);}finally{busy=false;}
 }
 $('recovery-delete').onclick=()=>remove('recovery');$('scene-delete').onclick=()=>remove(sceneKey());
 async function restore(key='recovery'){
  if(busy)return;
  if(!rights.checked||decks.some(d=>d.file||d.loading||d.prepared))return status('Confirm music permission and unload both decks before restoring.');
  busy=true;$('recovery-restore').disabled=true;
  try{
   let record=await transaction('readonly',store=>store.get(key));
   if(!record&&key==='recovery'){const old=await transaction('readonly',store=>store.getAll()),state=old.find(r=>r.version===1);if(state)record={state,files:state.decks.map(d=>d?old.find(r=>r.sha===d.sha):null)};}
   const state=validateRecovery(record?.state);
   if(state.performance&&($('phrase-consent').checked!==true)&&(state.performance.phrase||state.performance.performance))throw Error('Confirm phrase permission before restoring voices.');
   if(!Array.isArray(record.files)||record.files.length!==2)throw Error('Saved audio is missing.');
   const files=[];let total=(state.performance?.phrase?.byteLength??0)+(state.performance?.performance?.files.reduce((n,f)=>n+f.bytes.byteLength,0)??0);
   for(const [i,d] of state.decks.entries()){
    if(!d){files.push(null);continue;}
    const file=record.files[i];if(!file||!(file.bytes instanceof ArrayBuffer)||!file.bytes.byteLength||file.bytes.byteLength>MAX_BYTES||typeof file.name!=='string'||file.name.length>255||typeof file.type!=='string')throw Error('Saved audio is missing.');
    total+=file.bytes.byteLength;if(total>MAX_BYTES||await digest(file.bytes)!==d.sha)throw Error('Saved audio is damaged.');
    files.push(new File([file.bytes],file.name,{type:file.type}));
   }
   for(const [i,file] of files.entries())if(file){
    const deck=decks[i],saved=state.decks[i];await loadTrack(deck,()=>file);
    if(deck.file!==file)throw Error('Restore interrupted. Your saved set is still available.');
    if(saved.buffered){await prepareFrames(deck);if(!deck.audio.buffer)throw Error('Beat controls could not be restored.');}
    if(!rights.checked||deck.file!==file||!deck.audio.paused)throw Error('Restore interrupted.');
    deck.audio.currentTime=saved.position;deck.audio.playbackRate=saved.rate;deck.restoreTransport(saved);
   }
   await session.restoreRecovery(state.performance);
   for(const id of Object.keys(ranges))$(id).value=String(state.values[id]);
   if(state.version===2){for(const id of Object.keys(extended))$(id).value=String(state.values[id]);$('echo-grid-c').value=state.echoGrid;keyboard.restoreSettings(state.root);keyboard.restorePattern(state.sequence);
    for(const id of ['tone-c','echo-c','delay-c','c-level'])$(id).dispatchEvent(new Event('input'));
   }
   $('crossfade-curve').value=state.curve;levels();decks.forEach(d=>{d.applyEQ();deckEffects(d);controls(d);});session.refresh();
   status('Set restored, paused. Check your levels and saved musical context, then press Play. Enable saving to keep new changes.');
  }catch(error){status(error.message);}finally{busy=false;$('recovery-restore').disabled=false;}
 }
 $('recovery-restore').onclick=()=>restore();$('scene-restore').onclick=()=>restore(sceneKey());
 window.addEventListener('pagehide',()=>{clearInterval(timer);});
 window.addEventListener('pageshow',event=>{if(event.persisted)timer=setInterval(tick,5000);});
}
