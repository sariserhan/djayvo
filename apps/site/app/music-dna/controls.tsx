'use client';
import {useEffect,useRef,useState} from 'react';
import {emptyTaste,validateTaste,tasteBrief,tasteRender,energies,instruments,type Taste} from '../../lib/taste';
import {tasteCatalogue,inferCatalogueTaste,type ReferenceChoice} from '../../lib/taste-catalogue';
export function TasteNotebook(){
 const [profile,setProfile]=useState<Taste>(emptyTaste),[message,setMessage]=useState(''),[brief,setBrief]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 const [rendering,setRendering]=useState(false),[seconds,setSeconds]=useState(30),[direction,setDirection]=useState(0);
 const [takes,setTakes]=useState<{name:string;url:string;seed:number;profile:Taste;direction:number}[]>([]);
 const [search,setSearch]=useState(''),[personalize,setPersonalize]=useState(false);
 const inferred=inferCatalogueTaste(profile.catalogue??[]);
 function choose(id:string,rating:ReferenceChoice['rating'],weight=3){setProfile({...profile,catalogue:[...(profile.catalogue??[]).filter(c=>c.id!==id),{id,rating,weight}]});}
 const worker=useRef<Worker|null>(null),urls=useRef<string[]>([]),deadline=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>{worker.current?.terminate();clearTimeout(deadline.current);urls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
 function cancel(){worker.current?.terminate();worker.current=null;clearTimeout(deadline.current);setRendering(false);setMessage('Composition stopped. Your previous preview is still available.');}
 function generate(){
  if(worker.current)return;
  try{
   const seed=crypto.getRandomValues(new Uint32Array(1))[0],snapshot=prepared(),request=tasteRender(snapshot,seed,seconds,direction);
   const active=new Worker('/studio/taste-worker.js',{type:'module'});worker.current=active;setRendering(true);setMessage('Composing on this device…');
   const finish=()=>{active.terminate();if(worker.current===active)worker.current=null;clearTimeout(deadline.current);setRendering(false);};
   active.onerror=()=>{finish();setMessage('The local engine could not start. Retry after checking your connection.');};
   active.onmessage=({data})=>{
    if(worker.current!==active)return;
    if(data.type==='error'){finish();setMessage(data.message);return;}
    if(data.type!=='complete')return;
    const next=(data.files as {name:string;bytes:Uint8Array}[]).map(file=>({name:file.name,seed,profile:snapshot,direction,url:URL.createObjectURL(new Blob([new Uint8Array(file.bytes)],{type:file.name.endsWith('.wav')?'audio/wav':'application/json'}))}));
    const kept=[...takes.slice(-3),...next],keepUrls=new Set(kept.map(file=>file.url));
    urls.current.filter(url=>!keepUrls.has(url)).forEach(url=>URL.revokeObjectURL(url));urls.current=kept.map(file=>file.url);setTakes(kept);finish();
    setMessage('Your local composition is ready. Press Play to listen; no credits were charged.');
   };
   deadline.current=setTimeout(()=>{finish();setMessage('Composition took too long. Try a shorter duration; your previous preview is preserved.');},120000);
   active.postMessage(request);
  }catch(error){worker.current?.terminate();worker.current=null;clearTimeout(deadline.current);setRendering(false);setMessage(error instanceof Error?error.message:'Unable to compose.');}
 }
 useEffect(()=>{try{const old=localStorage.getItem('jamloom-taste-v1');if(old)setProfile(validateTaste(JSON.parse(old)));const feedback=JSON.parse(localStorage.getItem('jamloom-dna-preference')??'null');if(feedback?.profile&&Number.isInteger(feedback.direction)&&feedback.direction>=0&&feedback.direction<=2){validateTaste(feedback.profile);setDirection(feedback.direction);setPersonalize(true);}}catch{setMessage('Saved preferences could not be read. Start a new profile or clear this device’s saved profile.');}},[]);
 const prepared=()=>validateTaste({...profile,references:profile.references.filter(s=>s.trim())});
 function save(){try{const p=prepared();localStorage.setItem('jamloom-taste-v1',JSON.stringify(p));setBrief(JSON.stringify(tasteBrief(p),null,2));setMessage('Saved on this device. Three creative directions prepared; no audio generated.');}catch{setMessage('Use at most 20 non-empty references, 160 characters each, and select at least one instrument. Device storage must be available.');}}
 async function sync(method:'GET'|'POST'|'DELETE'){
  setBusy(true);try{const response=await fetch('/api/taste',{method,headers:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(method==='POST'?{profile:prepared(),revision}:{revision})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(method==='GET'){if(!data.saved){setRevision(0);setMessage('No account profile saved. Your local draft is unchanged.');}else{setProfile(validateTaste(data.saved.profile));setRevision(data.saved.revision);setBrief('');setMessage('Loaded your account profile into this draft. Local saved preferences are unchanged until you save them.');}}
   else if(method==='POST'){setRevision(data.revision);setMessage('Preferences saved privately to your account. No training permission granted.');}
   else{setRevision(0);setMessage('Account profile deleted. Your local draft and saved local profile are unchanged.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Account preferences unavailable.');}finally{setBusy(false);}
 }
 function prefer(take:typeof takes[number],index:number){try{
  localStorage.setItem('jamloom-dna-preference',JSON.stringify({seed:take.seed,savedAt:Date.now(),...(personalize?{profile:take.profile,direction:take.direction}:{})}));
  if(personalize){const next={...profile,energy:take.profile.energy,tempo:take.profile.tempo,instruments:[...take.profile.instruments],novelty:take.profile.novelty};setProfile(next);setDirection(take.direction);localStorage.setItem('jamloom-taste-v1',JSON.stringify(next));}
  setMessage(personalize?`Variation ${index+1} preferences applied and saved for your next composition. No model is trained or data uploaded.`:'Preferred variation noted on this device. Enable preference adaptation to reuse its settings.');
 }catch{setMessage('Preference could not be saved on this device.');}}
 function clear(){try{localStorage.removeItem('jamloom-taste-v1');localStorage.removeItem('jamloom-dna-preference');setProfile(emptyTaste);setDirection(0);setPersonalize(false);setBrief('');setMessage('Saved profile and feedback deleted from this device.');}catch{setMessage('Storage is unavailable. Clear site data in your browser settings.');}}
 return <section className="product-panel"><h2>Your preference notebook</h2><p>Tell us what matters to you. Song names are personal notes; we do not fetch, listen to or train on those recordings.</p><div className="product-controls">
 <label>Favourite tracks and artists — one per line<textarea disabled={busy} value={profile.references.join('\n')} maxLength={3220} onChange={e=>setProfile({...profile,references:e.target.value.split('\n')})}/></label>
 <fieldset><legend>Explore the cleared catalogue</legend><p>Search our small CC0 practice catalogue by title or artist. Choose the exact edition, then rate its influence. Other song names can stay in your notes above.</p>
 <label>Search cleared tracks<input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {tasteCatalogue.filter(t=>`${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())).map(track=>{
  const selected=profile.catalogue?.find(c=>c.id===track.id);
  return <article key={track.id}><strong>{track.title} — {track.artist}</strong><p>{track.edition} · {track.genre} · {Math.round(track.seconds)} seconds · <a href={track.source} target="_blank" rel="noreferrer">CC0 source</a></p>
  <label>Rating for {track.title}<select disabled={busy} value={selected?.rating??''} onChange={e=>e.target.value?choose(track.id,e.target.value as ReferenceChoice['rating'],selected?.weight):setProfile({...profile,catalogue:profile.catalogue?.filter(c=>c.id!==track.id)})}><option value="">Not selected</option><option value="love">Love</option><option value="like">Like</option><option value="avoid">Avoid</option></select></label>
  {selected&&<label>Influence of {track.title}: {selected.weight}<input disabled={busy} type="range" min="1" max="5" value={selected.weight} onChange={e=>choose(track.id,selected.rating,Number(e.target.value))}/></label>}</article>;
 })}
 {inferred.evidence.length>0&&<div><h3>What your selections tell us</h3><ul>{inferred.genres.map(g=><li key={g.genre}>{g.genre}: {g.score>0?'preferred':g.score<0?'avoid':'neutral'} ({g.score})</li>)}</ul><p>{inferred.explanation} Confidence: limited catalogue metadata. Tempo, key, melody, instrumentation, language and energy are unknown.</p></div>}
 </fieldset>
 <label>Energy<select disabled={busy} value={profile.energy} onChange={e=>setProfile({...profile,energy:e.target.value as Taste['energy']})}>{energies.map(e=><option key={e}>{e}</option>)}</select></label>
 <label>Preferred tempo: {profile.tempo} BPM<input disabled={busy} type="range" min="60" max="180" value={profile.tempo} onChange={e=>setProfile({...profile,tempo:Number(e.target.value)})}/></label>
 <fieldset><legend>Instruments you enjoy</legend>{instruments.map(i=><label key={i}><input disabled={busy} type="checkbox" checked={profile.instruments.includes(i)} onChange={e=>setProfile({...profile,instruments:e.target.checked?[...profile.instruments,i]:profile.instruments.filter(v=>v!==i)})}/>{i}</label>)}</fieldset>
 <label>Room for surprise: {profile.novelty}%<input disabled={busy} type="range" min="0" max="100" value={profile.novelty} onChange={e=>setProfile({...profile,novelty:Number(e.target.value)})}/></label>
 <button className="primary" disabled={busy} onClick={save}>Save preferences and prepare directions</button><button className="secondary" disabled={busy} onClick={clear}>Delete saved profile</button><p role="status">{message}</p>
 {brief&&<><h3>Three possible musical directions</h3><p>Rhythmic conversation · melodic development · bass and silence. These are planning alternatives, not finished songs. Your selected tempo, instruments and energy guide each proposal.</p><details><summary>View or copy the creative brief</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{brief}</pre></details></>}
 <fieldset><legend>Optional account copy</legend><p>These actions send only your written references and preferences to your private account. <a href="/account/sign-in">Sign in</a> first. Load an existing account profile before updating it.</p><div className="product-actions"><button className="secondary" disabled={busy} onClick={()=>sync('GET')}>Load account profile</button><button className="secondary" disabled={busy} onClick={()=>sync('POST')}>Save preferences to account</button><button className="secondary" disabled={busy||revision===0} onClick={()=>sync('DELETE')}>Delete account profile</button></div></fieldset>
 <fieldset><legend>Compose from your preferences</legend><p>Experimental instrumental music, made on this device with the Jamloom engine. Your song notes are not sent to the renderer. Voice needs a recording in <a href="/improvise">AI Improvisation</a>.</p>
 <label>Musical direction<select disabled={rendering} value={direction} onChange={e=>setDirection(Number(e.target.value))}><option value={0}>Rhythmic conversation</option><option value={1}>Melodic development</option><option value={2}>Bass and silence</option></select></label>
 <label>Approximate duration<select disabled={rendering} value={seconds} onChange={e=>setSeconds(Number(e.target.value))}>{[30,60,120,180].map(s=><option key={s} value={s}>{s} seconds</option>)}</select></label>
 <button className="primary" disabled={rendering||busy} onClick={generate}>{rendering?'Composing…':takes.length?'Make another variation':'Generate local preview'}</button>
 {rendering&&<button className="secondary" onClick={cancel}>Cancel composition</button>}
 <label><input type="checkbox" checked={personalize} onChange={e=>setPersonalize(e.target.checked)}/>Use my preferred Jamloom variation’s settings for future compositions on this device</label>
 {takes.length>0&&<div><h3>Your composition</h3>{takes.filter(t=>t.name.endsWith('.wav')).map((take,i)=><article key={take.url}><h4>Variation {i+1}</h4><audio aria-label={`Composition variation ${i+1}`} controls preload="metadata" src={take.url} onPlay={event=>{document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}}/><div className="product-actions">{takes.filter(t=>t.seed===take.seed).map(t=><a key={t.name} className="secondary" href={t.url} download={`jamloom-dna-${t.seed}.${t.name.split('.').slice(1).join('.')}`}>Download {t.name.endsWith('.wav')?'WAV':t.name.includes('score')?'score':'audio report'}</a>)}</div><button className="secondary" onClick={()=>prefer(take,i)}>Prefer variation {i+1}</button></article>)}<p>Compare your latest two variations. Download anything you want to keep before leaving. Musical quality is still under evaluation.</p></div>}
 <p>Local previews are free. Paid cloud generation remains closed.</p></fieldset></div></section>;
}
