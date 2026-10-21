const $=id=>document.getElementById(id);
const MAX_BYTES=100*1024*1024;
const ranges={crossfade:[0,1],master:[0,1],...Object.fromEntries(['a','b'].flatMap(d=>[
 [`level-${d}`,[0,1]],[`tone-${d}`,[0,100]],[`echo-${d}`,[0,.5]],[`delay-${d}`,[100,800]],
 ...[0,1,2].map(b=>[`eq-${d}-${b}`,[-12,12]])]))};
const bounded=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function validateRecovery(state){
 if(state?.version!==1||!Array.isArray(state.decks)||state.decks.length!==2||
  !['linear','smooth','cut'].includes(state.curve)||!state.values||
  !Object.entries(ranges).every(([id,[min,max]])=>bounded(state.values[id],min,max)))throw Error('Saved controls are damaged.');
 for(const d of state.decks){
  if(!d)continue;
  if(!/^[a-f0-9]{64}$/.test(d.sha)||!bounded(d.duration,0,1200)||!bounded(d.position,0,d.duration)||
   !bounded(d.rate,.84,1.16)||typeof d.buffered!=='boolean'||typeof d.loop!=='boolean'||typeof d.keylock!=='boolean'||
   !(d.bpm===''||bounded(Number(d.bpm),40,240))||!bounded(d.cue,0,d.duration)||!Array.isArray(d.hot)||d.hot.length!==4||
   !d.hot.every(n=>n===null||bounded(n,0,d.duration))||
   !(d.region===null||d.buffered&&Array.isArray(d.region)&&d.region.length===2&&bounded(d.region[0],0,d.duration)&&bounded(d.region[1],d.region[0]+.001,d.duration)))throw Error('Saved deck is damaged.');
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
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export function attachStudioRecovery({decks,rights,loadTrack,prepareFrames,levels,deckEffects,controls}){
 let busy=false,cache=new WeakMap(),saving=Promise.resolve();
 const status=text=>{$('recovery-status').textContent=text;};
 async function save(){
  if(busy||!$('remember-set').checked||!rights.checked||decks.some(d=>d.loading||d.starting||d.preparing||d.prepared))return;
  busy=true;
  try{
   const files=decks.map(d=>d.file),changed=[],prepared=new Map();
   if(files.some(file=>file?.jamloomOnlineOnly))throw Error('Aurowall partner tracks are online only and cannot be saved for set recovery. Your previous saved set is kept.');
   if(files.reduce((n,f)=>n+(f?.size??0),0)>MAX_BYTES)throw Error('Set recovery supports up to 100 MB of local files. Download recordings separately.');
   for(const [index,file] of files.entries())if(file&&!cache.has(file)){
    const bytes=await file.arrayBuffer(),sha=await digest(bytes);prepared.set(file,{sha});changed.push([index,{name:file.name,type:file.type,bytes,sha}]);
   }
   if(!$('remember-set').checked||!rights.checked||files.some((file,i)=>file!==decks[i].file))return;
   const state=validateRecovery({version:1,curve:$('crossfade-curve').value,values:Object.fromEntries(Object.keys(ranges).map(id=>[id,Number($(id).value)])),
    decks:decks.map(d=>d.file?{sha:(prepared.get(d.file)??cache.get(d.file)).sha,duration:d.duration,position:d.audio.roll?d.audio.rollPosition():d.audio.currentTime,rate:d.audio.playbackRate,
     buffered:!!d.audio.buffer,loop:!!d.loop,keylock:$(`keylock-${d.id}`).checked,bpm:$(`bpm-${d.id}`).value,
     region:d.audio.roll?null:d.audio.region??null,...d.transportState()}:null)});
   await transaction('readwrite',store=>{
    for(const [i,file] of files.entries())if(file&&!changed.some(([index])=>index===i)){
     const previous=store.get(String(i));previous.onsuccess=()=>{if(previous.result?.sha!==state.decks[i].sha)store.transaction.abort();};
    }
    for(const [i,file] of changed)store.put(file,String(i));for(const [i,file] of files.entries())if(!file)store.delete(String(i));store.put(state,'state');
   });
   for(const [file,identity] of prepared)cache.set(file,identity);
   status('Set recovery saved on this device. Playback will restore paused.');
  }catch(error){cache=new WeakMap();status(error.message);}finally{busy=false;}
 }
 const tick=()=>{saving=save();};
 let timer=setInterval(tick,5000);
 $('remember-set').onchange=()=>{if($('remember-set').checked)tick();else status('Automatic saving stopped. Delete the saved set to remove its audio.');};
 $('recovery-save').onclick=tick;
 $('recovery-delete').onclick=async()=>{
  if(busy){status('Wait for the current save or restore, then delete the saved set.');return;}
  $('remember-set').checked=false;
  try{await saving;await transaction('readwrite',store=>store.clear());cache=new WeakMap();status('Saved set and its local audio deleted. Loaded decks are unchanged.');}catch(error){status(error.message);}
 };
 $('recovery-restore').onclick=async()=>{
  if(busy)return;
  if(!rights.checked||decks.some(d=>d.file||d.loading||d.prepared))return status('Confirm music permission and unload both decks before restoring.');
  busy=true;$('recovery-restore').disabled=true;
  try{
   const record=await transaction('readonly',store=>store.getAll()),state=validateRecovery(record.find(r=>r.version===1));
   const files=[];let total=0;
   for(const d of state.decks){
    if(!d){files.push(null);continue;}
    const file=record.find(r=>r.sha===d.sha);if(!file||!(file.bytes instanceof ArrayBuffer)||!file.bytes.byteLength||
      file.bytes.byteLength>MAX_BYTES||typeof file.name!=='string'||file.name.length>255||typeof file.type!=='string')throw Error('Saved audio is missing.');
    total+=file.bytes.byteLength;if(total>MAX_BYTES||await digest(file.bytes)!==d.sha)throw Error('Saved audio is damaged.');
    files.push(new File([file.bytes],file.name,{type:file.type}));
   }
   for(const [i,file] of files.entries())if(file){
    const deck=decks[i],saved=state.decks[i];await loadTrack(deck,()=>file);
    if(deck.file!==file)throw Error('Restore interrupted. Your saved set is still available.');
    if(saved.buffered){await prepareFrames(deck);if(!deck.audio.buffer)throw Error('Beat controls could not be restored.');}
    if(!rights.checked||deck.file!==file||!deck.audio.paused)throw Error('Restore interrupted.');
    deck.audio.currentTime=saved.position;deck.audio.playbackRate=saved.rate;deck.restoreTransport(saved);
    cache.set(file,{sha:saved.sha});
   }
   for(const [id,value] of Object.entries(state.values))$(id).value=String(value);
   $('crossfade-curve').value=state.curve;levels();decks.forEach(d=>{d.applyEQ();deckEffects(d);controls(d);});
   status('Set restored, paused. Check your levels and press Play. Enable saving to keep new changes.');
  }catch(error){status(error.message);}finally{busy=false;$('recovery-restore').disabled=false;}
 };
 window.addEventListener('pagehide',()=>{clearInterval(timer);});
 window.addEventListener('pageshow',event=>{if(event.persisted)timer=setInterval(tick,5000);});
}
