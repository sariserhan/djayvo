'use client';
import {useEffect,useRef,useState} from 'react';
import styles from '../../../../assets/manifests/improvise-styles.json';
import {GenerationProgress,type SongProgress} from '../generation-progress';
import {songRecording} from '../../lib/song-recording';
const endpoint='/api/improvise/song',historyKey='jamloom-improvise-song';
type Quote={token:string;credits:number;expiresAt:number};
export function ImproviseCreate(){
 const [file,setFile]=useState<Blob|null>(null),[name,setName]=useState(''),[preview,setPreview]=useState(''),[genre,setGenre]=useState('surprise'),[voice,setVoice]=useState('surprise');
 const [consent,setConsent]=useState(false),[visibility,setVisibility]=useState<'public'|'private'>('public'),[sharing,setSharing]=useState(false),[open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[message,setMessage]=useState(''),[job,setJob]=useState<string|null>(null),[progress,setProgress]=useState<SongProgress|null>(null),[ready,setReady]=useState<string|null>(null),[quote,setQuote]=useState<Quote|null>(null);
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),recordTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),dialog=useRef<HTMLDialogElement>(null),alive=useRef(true),sourceId=useRef<string|null>(null),requestId=useRef<string|null>(null),upload=useRef<AbortController|null>(null),submitting=useRef(false),cancelWanted=useRef(false);
 const locked=busy||!!job||recording;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;upload.current?.abort();clearTimeout(recordTimer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setPreview(url);sourceId.current=null;setQuote(null);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{setQuote(null);requestId.current=null;},[genre,voice,visibility]);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
 useEffect(()=>{
  try{const id=localStorage.getItem(historyKey);if(id&&/^[a-f0-9]{32}$/.test(id))setJob(id);}catch{}
  void fetch(endpoint,{signal:AbortSignal.timeout(10000)}).then(r=>r.json()).then(data=>{if(alive.current&&data.active)setJob(data.active);}).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(!job)return;let stopped=false,timer:ReturnType<typeof setTimeout>;const checkingUntil=Date.now()+60000;
  try{localStorage.setItem(historyKey,job);}catch{}
  async function poll(){
   try{const r=await fetch(endpoint+'?id='+job,{signal:AbortSignal.timeout(10000)}),data=await r.json();if(stopped)return;
    if(r.status===404&&Date.now()>checkingUntil){setJob(null);setBusy(false);setProgress(null);setMessage('This request did not start. You can try again.');localStorage.removeItem(historyKey);return;}if(!r.ok)throw Error();
    if(data.state==='queued'||data.state==='running'){if(cancelWanted.current||localStorage.getItem(historyKey+'-cancel')===job)await fetch(endpoint+'?id='+job,{method:'DELETE',headers:{'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(10000)});}
    setProgress({state:data.cancelling?'cancelling':data.state,phase:data.phase});
    if(['completed','failed','cancelled'].includes(data.state)){
     setJob(null);setBusy(false);cancelWanted.current=false;localStorage.removeItem(historyKey+'-cancel');requestId.current=null;sourceId.current=null;setQuote(null);
     if(data.state==='completed'){setReady(job);window.dispatchEvent(new Event('jamloom-dna-completed'));}return;
    }
   }catch{if(stopped)return;setProgress({state:'reconnecting'});}
   timer=setTimeout(poll,3000);
  }
  void poll();return()=>{stopped=true;clearTimeout(timer);};
 },[job]);
 async function record(){
  if(recording){recorder.current?.stop();return;}
  if(!consent)return;setMessage('');setBusy(true);
  try{
   const audio=await navigator.mediaDevices.getUserMedia({audio:true});if(!alive.current){audio.getTracks().forEach(t=>t.stop());return;}
   stream.current=audio;const chunks:Blob[]=[];const r=new MediaRecorder(audio);recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=()=>{clearTimeout(recordTimer.current);audio.getTracks().forEach(t=>t.stop());recorder.current=null;stream.current=null;if(alive.current){setFile(new Blob(chunks,{type:r.mimeType}));setName('Your recording');setRecording(false);}};
   r.start();setRecording(true);recordTimer.current=setTimeout(()=>r.stop(),300000);
  }catch{setMessage('Microphone unavailable. You can upload a recording instead.');}finally{setBusy(false);}
 }
 async function post(body:unknown,submit=false){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:JSON.stringify(body),signal:submit?AbortSignal.timeout(20000):upload.current?.signal});const data=await r.json();if(!r.ok)throw Error(data.error??'Could not start your song.');return data;}
 async function generate(){
  if(!file||!consent||busy||job)return;setBusy(true);setMessage('');setProgress({state:'running',phase:'preparing'});upload.current=new AbortController();cancelWanted.current=false;
  try{
   const availability=await fetch(endpoint,{signal:upload.current.signal}),status=await availability.json();
   if(!status.creditsEnabled)throw Error('Song creation is not open here yet. Your recording stays on your device.');
   if(!status.signedIn)throw Error('Sign in with a verified account first.');
   if(status.active){setJob(status.active);setOpen(false);return;}
   if(!sourceId.current){
    const source=await songRecording(file);upload.current.signal.throwIfAborted();
    const grant=await post({action:'upload',bytes:source.bytes,sha256:source.sha256,consent});
    const sent=await fetch(grant.url,{method:'PUT',headers:{'Content-Type':'audio/wav'},body:source.audio,signal:upload.current.signal});if(!sent.ok)throw Error('The upload didn’t finish. Your recording is still here. Try again.');sourceId.current=grant.id;
   }
   const profile={sourceId:sourceId.current,genre,voice,phrase:'',consent};
   let price=quote&&quote.expiresAt>Date.now()?quote:null;
   if(!price){price=await post({action:'quote',profile,visibility,publicConsent:sharing});setQuote(price);if(price!.credits>(visibility==='private'?2:1)){setMessage(`This song needs ${price!.credits} credits. Review the price and confirm to continue.`);setProgress(null);return;}}
   requestId.current??=crypto.randomUUID().replaceAll('-','');
   submitting.current=true;try{localStorage.setItem(historyKey,requestId.current);}catch{}
   const result=await post({action:'submit',requestId:requestId.current,token:price!.token,profile,visibility,publicConsent:sharing},true);
   setJob(result.id);setProgress({state:result.state});setOpen(false);
  }catch(error){if(submitting.current&&requestId.current){if(alive.current){setJob(requestId.current);setOpen(false);setProgress({state:'reconnecting'});}return;}if(alive.current&&!upload.current?.signal.aborted){setProgress({state:'failed'});setMessage(error instanceof Error?error.message:'Unable to start your song.');}}
  finally{submitting.current=false;setBusy(false);upload.current=null;}
 }
 async function cancel(){
  if(submitting.current&&requestId.current){cancelWanted.current=true;try{localStorage.setItem(historyKey+'-cancel',requestId.current);}catch{}setProgress({state:'cancelling'});return;}
  if(!job){upload.current?.abort();setOpen(false);setProgress({state:'cancelled'});return;}
  try{const r=await fetch(endpoint+'?id='+job,{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});if(!r.ok)throw Error();setProgress({state:'cancelling'});}catch{setMessage('Could not confirm cancellation. We’re still checking your song.');}
 }
 return <section className="product-panel"><h2>Your sound. A new song.</h2><p>Record or upload. Pick a style—or let us surprise you.</p>
  <div className="product-controls"><label><input type="checkbox" checked={consent} disabled={locked} onChange={e=>setConsent(e.target.checked)}/>I have permission to use this recording and send it to create my song.</label>
  <div className="product-actions"><button className="secondary" disabled={!consent||busy||!!job} onClick={record}>{recording?'Stop recording':'Record a sound'}</button><label>Upload audio<input type="file" accept="audio/*" disabled={locked} onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setName(f.name);}}}/></label></div>
  <small>Up to five minutes / 100 MB. We may use a phrase, a loop or the meaning of your recording. Nothing plays automatically.</small>
  {preview&&<><p>{name}</p><audio controls src={preview} aria-label="Your recording"/></>}
  <div className="product-actions"><label>Style<select value={genre} disabled={locked} onChange={e=>setGenre(e.target.value)}><option value="surprise">Surprise me</option>{Object.entries(styles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Singer<select value={voice} disabled={locked} onChange={e=>setVoice(e.target.value)}><option value="surprise">Surprise me</option><option value="female">Female</option><option value="male">Male</option></select></label></div>
  <button className="primary" disabled={!file||!consent||locked} onClick={()=>{setSharing(false);setMessage('');setOpen(true);}}>Make my song</button>
  {progress&&!open&&<GenerationProgress {...progress}/>} {!!job&&<button className="secondary" onClick={cancel}>Cancel song</button>}
  <p role="status">{!open?message:''}</p>
  <dialog ref={dialog} aria-labelledby="improvise-confirm-title" className="dna-generation-dialog" onCancel={e=>{e.preventDefault();void cancel();}}><h2 id="improvise-confirm-title">Make your song</h2><fieldset disabled={busy}><legend>Who can listen?</legend><label><input type="radio" checked={visibility==='public'} onChange={()=>{setVisibility('public');setSharing(false);}}/>Public · from 1 credit</label><label><input type="radio" checked={visibility==='private'} onChange={()=>{setVisibility('private');setSharing(false);}}/>Private · from 2 credits</label>{visibility==='public'&&<label><input type="checkbox" checked={sharing} onChange={e=>setSharing(e.target.checked)}/>I agree to share my finished song publicly, including any part of my recording used in it.</label>}</fieldset>
  <p>Your source recording is removed after processing. Failed or cancelled songs return reserved credits. A higher price needs your confirmation.</p><p><a href="/account/credits">Your credits</a> · <a href="/account/sign-in?callbackURL=%2Fimprovise">Sign in</a></p>
  <button className="primary" disabled={busy||(visibility==='public'&&!sharing)} onClick={generate}>{busy?'Preparing your song…':`Generate song · ${quote?.credits??(visibility==='private'?2:1)} credits`}</button><button className="secondary" onClick={cancel}>Cancel</button>{progress&&<GenerationProgress {...progress}/>}<p role="status">{message}</p></dialog>
  {ready&&<article><h3>Your new song</h3><audio controls preload="none" src={endpoint+'?id='+ready+'&file=audio'} aria-label="Play your new song"/><a href={endpoint+'?id='+ready+'&file=audio&download=1'} download>Download song</a></article>}
  </div></section>;
}
