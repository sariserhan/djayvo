'use client';
import {useEffect,useRef,useState} from 'react';
import {emptyTaste,validateTaste,tasteRender,type Taste} from '../../lib/taste';
import {automaticTaste,favoriteList,resolveFavoriteMetadata} from '../../lib/taste-auto';
import {FavoriteSearch} from './favorite-search';
import {tasteCatalogue,type ReferenceMetadata} from '../../lib/taste-catalogue';
export function TasteNotebook(){
 const [profile,setProfile]=useState<Taste>(emptyTaste),[message,setMessage]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [rendering,setRendering]=useState(false),[seconds,setSeconds]=useState(30),[search,setSearch]=useState('');
 const [takes,setTakes]=useState<{name:string;url:string;seed:number;group:string}[]>([]);
 const taste=automaticTaste(profile),locked=busy||rendering;
 const worker=useRef<Worker|null>(null),analysis=useRef<AbortController|null>(null),urls=useRef<string[]>([]),deadline=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),writable=useRef(false);
 useEffect(()=>{try{const old=localStorage.getItem('jamloom-taste-v1');if(old)setProfile(favoriteList(validateTaste(JSON.parse(old))));writable.current=true;}catch{setMessage('Saved favorites could not be read. You can start a new list.');}finally{setLoaded(true);}},[]);
 useEffect(()=>{if(!loaded||!writable.current)return;try{if(profile.references.length)localStorage.setItem('jamloom-taste-v1',JSON.stringify(profile));else localStorage.removeItem('jamloom-taste-v1');}catch{setMessage('Your list is available for this session, but this browser could not save it.');}},[profile,loaded]);
 useEffect(()=>()=>{analysis.current?.abort();worker.current?.terminate();clearTimeout(deadline.current);urls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
 function addSong(reference:string,metadata?:ReferenceMetadata){
  if(profile.references.some(r=>r.toLocaleLowerCase()===reference.toLocaleLowerCase())){setMessage('Already in your favorites.');return;}
  if(profile.references.length>=20){setMessage('Your list has 20 favorites. Remove one before adding another.');return;}
  try{const next=favoriteList(validateTaste({...profile,references:[...profile.references,reference],referenceMetadata:[...(profile.referenceMetadata??[]),...(metadata?[metadata]:[])]}));writable.current=true;setProfile(next);setMessage('Added to your favorites. Jamloom will choose the musical settings.');}
  catch{setMessage('This result could not be added. Try searching again.');}
 }
 function remove(reference:string){
  setProfile({...profile,references:profile.references.filter(r=>r!==reference),referenceMetadata:profile.referenceMetadata?.filter(m=>m.reference!==reference),songPreferences:profile.songPreferences?.filter(s=>s.reference!==reference),
   catalogue:profile.catalogue?.filter(c=>{const track=tasteCatalogue.find(t=>t.id===c.id);return !track||`${track.title} — ${track.artist}`!==reference;})});
 }
 function cancel(){analysis.current?.abort();analysis.current=null;worker.current?.terminate();worker.current=null;clearTimeout(deadline.current);setRendering(false);setMessage('Composition stopped. Your previous preview is still available.');}
 async function generate(){
  if(worker.current||analysis.current)return;
  const controller=new AbortController();analysis.current=controller;setRendering(true);setMessage('Finding the style in your favorites…');
  try{
   if(!profile.references.length)throw Error('Add at least one favorite first.');
   const resolved=await resolveFavoriteMetadata(profile,controller.signal),inferred=automaticTaste(resolved),snapshot=inferred.profile;
   controller.signal.throwIfAborted();setProfile(snapshot);
   const seed=crypto.getRandomValues(new Uint32Array(1))[0],request=tasteRender(snapshot,seed,seconds,snapshot.direction??0);
   const active=new Worker('/studio/taste-worker.js',{type:'module'});worker.current=active;setMessage('Composing your music…');
   const finish=()=>{active.terminate();if(worker.current===active)worker.current=null;analysis.current=null;clearTimeout(deadline.current);setRendering(false);};
   active.onerror=()=>{if(worker.current!==active)return;finish();setMessage('The local engine could not start. Retry after checking your connection.');};
   active.onmessage=({data})=>{
    if(worker.current!==active)return;
    if(data.type==='error'){finish();setMessage(data.message);return;}
    if(data.type!=='complete')return;
    const group=crypto.randomUUID();
    const next=(data.files as {name:string;bytes:Uint8Array}[]).map(file=>({name:file.name,seed,group,url:URL.createObjectURL(new Blob([new Uint8Array(file.bytes)],{type:file.name.endsWith('.wav')?'audio/wav':'application/json'}))}));
    const kept=[...takes.slice(-3),...next],keepUrls=new Set(kept.map(file=>file.url));
    urls.current.filter(url=>!keepUrls.has(url)).forEach(url=>URL.revokeObjectURL(url));urls.current=kept.map(file=>file.url);setTakes(kept);finish();
    setMessage(inferred.used?'Your music is ready. Press Play to listen.':'Your music is ready. We could not identify a supported style from this list, so this is a general original composition.');
   };
   deadline.current=setTimeout(()=>{finish();setMessage('Composition took too long. Your previous preview is preserved; you can try again.');},120000);
   active.postMessage(request);
  }catch(error){if(controller.signal.aborted)return;analysis.current=null;worker.current?.terminate();worker.current=null;clearTimeout(deadline.current);setRendering(false);setMessage(error instanceof Error?error.message:'Unable to compose.');}
 }
 async function sync(method:'GET'|'POST'|'DELETE'){
  setBusy(true);try{const response=await fetch('/api/taste',{method,headers:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(method==='POST'?{profile:taste.profile,revision}:{revision})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(method==='GET'){if(!data.saved){setRevision(0);setMessage('No account favorites saved. Your local list is unchanged.');}else{const next=favoriteList(validateTaste(data.saved.profile));writable.current=true;setProfile(next);setRevision(data.saved.revision);setMessage('Loaded your account favorites on this device.');}}
   else if(method==='POST'){setRevision(data.revision);setMessage('Favorites saved privately to your account. No training permission granted.');}
   else{setRevision(0);setMessage('Account favorites deleted. Your local list is unchanged.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Account favorites unavailable.');}finally{setBusy(false);}
 }
 function clear(){try{localStorage.removeItem('jamloom-taste-v1');localStorage.removeItem('jamloom-dna-preference');writable.current=true;setProfile(emptyTaste);setMessage('Favorites deleted from this device.');}catch{setMessage('Storage is unavailable. Clear site data in your browser settings.');}}
 return <section className="product-panel"><h2>Your favorite music</h2><p>Add songs or artists you love. We’ll find the common styles and compose an original instrumental piece. That’s all you need to do.</p><div className="product-controls">
 <FavoriteSearch saved={profile.references} disabled={locked||!loaded} onSelect={addSong}/>
 <div className="dna-favorites">{[...new Set(profile.references)].map(reference=><fieldset key={reference}><legend>{reference}</legend>
  <button className="secondary" disabled={locked} aria-label={`Remove favorite ${reference}`} onClick={()=>remove(reference)}>Remove favorite</button>
  <div className="product-actions"><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on YouTube ↗</a><a href={`https://open.spotify.com/search/${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on Spotify ↗</a></div>
 </fieldset>)}</div>
 {profile.references.length>0&&<div className="dna-summary"><h3>Your music DNA</h3><p>{taste.genres.length?taste.genres.map(g=>g.name).join(' · '):'We’ll look up the style of your favorites when you make your music.'}</p>
  <details><summary>How we choose your sound</summary><p>{taste.explanation}</p><p>{taste.used} of {taste.total} favorites currently guide the arrangement. Each favorite has equal influence; repeated entries count once. Unmatched names are kept in your list.</p>
   {taste.used>0&&<p>Our composition direction: {taste.profile.tempo} BPM, {taste.profile.energy} energy, {taste.profile.instruments.join(', ')}. These are our arrangement choices, not measured song features.</p>}
   <p>We use catalogue genre labels, not the original recordings. Exact groove, melody and harmony remain unknown. The result is an original interpretation; musical quality is still under evaluation.</p></details></div>}
 <button className="primary" disabled={locked||!loaded||!profile.references.length} onClick={generate}>{rendering?'Making your music…':takes.length?'Make another variation':'Make my music'}</button>
 {rendering&&<button className="secondary" onClick={cancel}>Cancel composition</button>}
 <p role="status">{message}</p>
 <p>Your favorites save automatically on this device. Local instrumental previews are free.</p>
 {takes.length>0&&<div><h3>Your composition</h3>{takes.filter(t=>t.name.endsWith('.wav')).map((take,i)=><article key={take.url}><h4>Variation {i+1}</h4><audio aria-label={`Composition variation ${i+1}`} controls preload="metadata" src={take.url} onPlay={event=>{document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}}/><div className="product-actions">{takes.filter(t=>t.group===take.group).map(t=><a key={t.name} className="secondary" href={t.url} download={`jamloom-dna-${t.seed}.${t.name.split('.').slice(1).join('.')}`}>Download {t.name.endsWith('.wav')?'WAV':t.name.includes('score')?'score':'audio report'}</a>)}</div></article>)}<p>Compare your latest two variations. Download anything you want to keep before leaving.</p></div>}
 <details><summary>Length and saved favorites</summary>
  <label>Approximate duration<select disabled={locked} value={seconds} onChange={e=>setSeconds(Number(e.target.value))}>{[30,60,120,180].map(s=><option key={s} value={s}>{s} seconds</option>)}</select></label>
  <button className="secondary" disabled={locked} onClick={clear}>Delete saved profile</button>
  <fieldset><legend>Optional account copy</legend><p><a href="/account/sign-in">Sign in</a> to keep your favorites on another device. Load an existing account list before updating it.</p><div className="product-actions"><button className="secondary" disabled={locked} onClick={()=>sync('GET')}>Load account profile</button><button className="secondary" disabled={locked} onClick={()=>sync('POST')}>Save preferences to account</button><button className="secondary" disabled={locked||revision===0} onClick={()=>sync('DELETE')}>Delete account profile</button></div></fieldset>
 </details>
 <details><summary>Discover practice tracks</summary><p>Listen to cleared tracks and add any you like to the same favorites list.</p>
 <label>Search cleared tracks<input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {tasteCatalogue.filter(t=>`${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())).map(track=><article key={track.id}><strong>{track.title} — {track.artist}</strong><p>{track.edition} · {track.genre} · <a href={track.source} target="_blank" rel="noreferrer">CC0 source</a></p>
  <audio aria-label={`Listen to ${track.title}`} controls preload="none" src={track.audio} onPlay={event=>{document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}} onError={()=>setMessage('This preview could not load. Try again or open its source link.')} />
  <button className="secondary" disabled={locked} onClick={()=>addSong(`${track.title} — ${track.artist}`)}>Add {track.title} to favorites</button>
 </article>)}
 </details>
 </div></section>;
}
