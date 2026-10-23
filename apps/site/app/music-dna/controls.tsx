'use client';
import {useEffect,useRef,useState} from 'react';
import {emptyTaste,validateTaste,type Taste} from '../../lib/taste';
import {automaticTaste,favoriteList,resolveFavoriteMetadata} from '../../lib/taste-auto';
import {favoriteKey,musicDirection,type FavoriteSnapshot} from '../../lib/taste-direction';
import languages from '../../../../assets/manifests/dna-languages.json';
import {SongFeedback,FeedbackSettings,listenerHeaders} from './song-feedback';
import {FavoriteSearch} from './favorite-search';
import {tasteCatalogue,type ReferenceMetadata} from '../../lib/taste-catalogue';
type SongPlan={language?:{code:string;label:string;basis:string};musical_traits?:Record<string,string>;title:string;summary:string;favorites?:{reference:string}[];influences:{reference:string;basis:string;description:string}[];cases:{lyrics:string;song_caption:string;bpm:number;voice:string}[]};
type Song={id:string;state:string;message:string;plan?:SongPlan;profile?:FavoriteSnapshot;direction?:{label:string};legacy?:boolean;styleChecked?:boolean};
const songUrl=(id:string)=>`/api/taste/song?id=${id}`;
export function TasteNotebook(){
 const [profile,setProfile]=useState<Taste>(emptyTaste),[message,setMessage]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [rendering,setRendering]=useState(false),[search,setSearch]=useState(''),[job,setJob]=useState<string|null>(null),[draft,setDraft]=useState<SongPlan|null>(null);
 const [takes,setTakes]=useState<Song[]>([]),[examples,setExamples]=useState<Song[]>([]);
 const snapshot={references:profile.references,referenceMetadata:profile.referenceMetadata??[],vocalLanguage:profile.vocalLanguage},direction=musicDirection(snapshot);
 const current=takes.filter(s=>s.styleChecked&&s.profile&&favoriteKey(s.profile)===favoriteKey(snapshot));
 const earlier=takes.filter(s=>!current.includes(s));
 const taste=automaticTaste(profile),locked=busy||rendering;
 const analysis=useRef<AbortController|null>(null),writable=useRef(false),mounted=useRef(true);
 useEffect(()=>{try{const old=localStorage.getItem('jamloom-taste-v1');if(old)setProfile(favoriteList(validateTaste(JSON.parse(old))));writable.current=true;}catch{setMessage('Saved favorites could not be read. You can start a new list.');}finally{setLoaded(true);}},[]);
 useEffect(()=>{if(!loaded||!writable.current)return;try{if(profile.references.length)localStorage.setItem('jamloom-taste-v1',JSON.stringify(profile));else localStorage.removeItem('jamloom-taste-v1');}catch{setMessage('Your list is available for this session, but this browser could not save it.');}},[profile,loaded]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;analysis.current?.abort();};},[]);
 useEffect(()=>{
  let stopped=false;
  void (async()=>{
   try{
    const history=JSON.parse(localStorage.getItem('jamloom-dna-songs-v1')??'[]');
    const saved=[...(Array.isArray(history)?history:[]).slice(-2).map((id:string)=>({id,example:false})),...new URLSearchParams(location.search).getAll('song').slice(-6).map(id=>({id,example:true}))];
    for(const {id,example} of saved)if(typeof id==='string'&&/^[a-f0-9]{32}$/.test(id)){
     const response=await fetch(songUrl(id),{signal:AbortSignal.timeout(10000)});if(!response.ok)continue;
     const song:Song=await response.json();if(stopped)return;
     if(song.state==='completed')(example?setExamples:setTakes)(old=>[...old.filter(s=>s.id!==id),song].slice(example?-6:-2));
     else if(song.state==='running'&&!example){setJob(id);setRendering(true);}
    }
   }catch{/* Favorites remain independent of song-history availability. */}
  })();return()=>{stopped=true;};
 },[]);
 useEffect(()=>{
  if(!job)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  const controller=new AbortController();
  const poll=async()=>{
   try{
    const response=await fetch(songUrl(job),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    const song=await response.json();if(stopped)return;
    if(!response.ok){if(response.status===404||response.status===409){setRendering(false);setJob(null);setMessage(song.error??'This song is unavailable. Your favorites are safe.');return;}throw Error(song.error);}
    setMessage(song.message);if(song.plan)setDraft(song.plan);
    if(song.state!=='running'){
     setRendering(false);setJob(null);
     if(song.state==='completed')setTakes(old=>[...old.filter(s=>s.id!==job),song].slice(-2));
     return;
    }
   }catch{if(stopped)return;setMessage('Waiting to reconnect to your song. Your favorites are saved.');}
   timer=setTimeout(poll,3000);
  };
  void poll();return()=>{stopped=true;controller.abort();clearTimeout(timer);};
 },[job]);
 useEffect(()=>{if(!takes.length&&!job)return;try{const previous=JSON.parse(localStorage.getItem('jamloom-dna-songs-v1')??'[]');localStorage.setItem('jamloom-dna-songs-v1',JSON.stringify([...new Set([...(Array.isArray(previous)?previous:[]),...takes.map(t=>t.id),...(job?[job]:[])])].slice(-2)));}catch{}},[takes,job]);
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
 async function cancel(){
  analysis.current?.abort();analysis.current=null;
  if(job){
   try{const response=await fetch(songUrl(job),{method:'DELETE',headers:{'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error);setJob(null);}
   catch(error){setMessage(error instanceof Error?error.message:'Could not stop the song.');return;}
  }
  setRendering(false);setMessage('Composition stopped. Your previous songs are still available.');
 }
 async function generate(){
  if(analysis.current||job)return;
  const controller=new AbortController();analysis.current=controller;setRendering(true);setDraft(null);setMessage('Finding the music in your favorites…');
  try{
   if(!profile.references.length)throw Error('Add at least one favorite first.');
   const available=await fetch('/api/taste/song',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   const readiness=await available.json();if(!available.ok)throw Error(readiness.error);
   if(readiness.active)throw Error('Another song is being made on this Mac. Your saved list is unchanged; try again when it finishes.');
   const resolved=await resolveFavoriteMetadata(profile,controller.signal);controller.signal.throwIfAborted();setProfile(resolved);
   // Keep the submission response so cancellation can stop an accepted job instead of losing its id.
   const response=await fetch('/api/taste/song',{method:'POST',headers:{'Content-Type':'application/json','X-Jamloom-DNA':'1',...listenerHeaders()},body:JSON.stringify(resolved),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   if(controller.signal.aborted||!mounted.current){await fetch(songUrl(result.id),{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});return;}
   setJob(result.id);setMessage('Writing your song…');
  }catch(error){if(!controller.signal.aborted&&mounted.current){setRendering(false);setMessage(error instanceof Error?error.message:'Unable to make this song.');}}
  finally{if(analysis.current===controller)analysis.current=null;}
 }
 async function sync(method:'GET'|'POST'|'DELETE'){
  setBusy(true);try{const response=await fetch('/api/taste',{method,headers:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(method==='POST'?{profile:taste.profile,revision}:{revision})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(method==='GET'){if(!data.saved){setRevision(0);setMessage('No account favorites saved. Your local list is unchanged.');}else{const next=favoriteList(validateTaste(data.saved.profile));writable.current=true;setProfile(next);setRevision(data.saved.revision);setMessage('Loaded your account favorites on this device.');}}
   else if(method==='POST'){setRevision(data.revision);setMessage('Favorites saved privately to your account. No training permission granted.');}
   else{setRevision(0);setMessage('Account favorites deleted. Your local list is unchanged.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Account favorites unavailable.');}finally{setBusy(false);}
 }
 function clear(){try{localStorage.removeItem('jamloom-taste-v1');localStorage.removeItem('jamloom-dna-preference');writable.current=true;setProfile(emptyTaste);setMessage('Favorites deleted from this device.');}catch{setMessage('Storage is unavailable. Clear site data in your browser settings.');}}
 function songCard(take:Song,i:number){return <article key={take.id} data-song-id={take.id}>
 <h4>{take.plan?.title??`Song ${i+1}`}</h4><p>2 min · AI singing{take.plan?.language?` · ${take.plan.language.label}`:''}{take.direction?` · ${take.direction.label}`:''}</p>
 <p><strong>Made from:</strong> {take.profile?.references.join(' · ')??'Original list unavailable'}</p>
 {take.profile?.referenceMetadata?.length? <p>{[...new Set(take.profile.referenceMetadata.map(m=>m.genre))].join(' · ')}</p>:null}
 <p>{take.styleChecked?'Broad style check passed. Listen to judge the song and singing.':'Earlier take: style match has not been checked.'}</p>
 <audio aria-label={`Play ${take.plan?.title??`song ${i+1}`}`} controls preload="metadata" src={`${songUrl(take.id)}&file=audio`} onPlay={event=>{document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}} onError={()=>setMessage('This song could not load. Your favorites are safe. Reload to reconnect to the local singer.')}/>
 <div className="product-actions"><a className="secondary" href={`${songUrl(take.id)}&file=audio&download=1`} download>Download song</a><a className="secondary" href={`${songUrl(take.id)}&file=plan`} download>Download song notes</a></div>
 {take.styleChecked&&<SongFeedback id={take.id}/>}
 {take.plan?.musical_traits&&<details><summary>The musical choices</summary><dl>{Object.entries(take.plan.musical_traits).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{value}</dd></div>)}</dl></details>}
 {take.plan&&<><details><summary>Lyrics</summary><p style={{whiteSpace:'pre-wrap'}}>{take.plan.cases[0].lyrics}</p></details><details><summary>How these favorites shaped this song</summary><p>{take.plan.summary}</p><ul>{take.plan.influences.map(note=><li key={note.reference}><strong>{note.reference}</strong>: {note.description} {note.basis==='unknown'?'(Unrecognized)':note.basis==='genre_only'?'(Catalogue genre only)':'(Model interpretation)'}</li>)}</ul><p>{take.plan.cases[0].song_caption}</p><p>Musical direction uses catalogue metadata and model interpretation, not analysis of the original recordings. A style check cannot guarantee musical quality.</p></details></>}
 </article>;}
 return <section className="product-panel"><h2>Your favorite music</h2><p>Add songs or artists you love. We’ll use your list to write a new song, with an AI singer and a full arrangement. No music brief needed.</p><div className="product-controls">
 <label>Singing language<select disabled={locked||!loaded} value={profile.vocalLanguage??'auto'} onChange={e=>{writable.current=true;setProfile({...profile,vocalLanguage:e.target.value});}}><option value="auto">Choose from my favorites</option>{Object.entries(languages.languages).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label><p>Language is optional. These are the singer’s supported language settings; pronunciation and musical quality can vary.</p>
 <FavoriteSearch saved={profile.references} disabled={locked||!loaded} onSelect={addSong}/>
 <div className="dna-favorites">{[...new Set(profile.references)].map(reference=><fieldset key={reference}><legend>{reference}</legend>
  <button className="secondary" disabled={locked} aria-label={`Remove favorite ${reference}`} onClick={()=>remove(reference)}>Remove favorite</button>
  <div className="product-actions"><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on YouTube ↗</a><a href={`https://open.spotify.com/search/${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on Spotify ↗</a></div>
 </fieldset>)}</div>
 {profile.references.length>0&&<div className="dna-summary"><h3>Your music DNA</h3><p>{taste.genres.length?taste.genres.map(g=>g.name).join(' · '):'We’ll look up the style of your favorites when you make your music.'}</p>
  {direction&&<p><strong>Song direction: {direction.label}</strong> · {direction.energy}. Based on {direction.coverage} of {direction.total} favorites with recognized catalogue genres.</p>}
  <details><summary>How we choose your sound</summary><p>We consider your whole list to choose a groove, instruments, mood and vocal delivery, then write original lyrics and music. The song’s direction will appear below while it is being made.</p><p>Catalogue genres and the model’s knowledge guide this interpretation. We don’t listen to or sample the original recordings, and unfamiliar names may not provide enough information.</p></details></div>}
 <button className="primary" disabled={locked||!loaded||!profile.references.length} onClick={generate}>{rendering?'Making your music…':takes.length?'Make another variation':'Make my music'}</button>
 {rendering&&<button className="secondary" onClick={cancel}>Cancel composition</button>}
 <p role="status">{message}</p>
 <p>Your favorites save automatically on this device. This local song preview takes several minutes. Playback starts only when you press Play.</p>
 {draft&&rendering&&<div><h3>{draft.title}</h3>{draft.favorites&&<p><strong>Making a song from:</strong> {draft.favorites.map(f=>f.reference).join(' · ')}</p>}<p>{draft.summary}</p></div>}
 {current.length>0&&<section aria-label="Songs for this list"><h3>Songs for this list</h3>{current.map(songCard)}</section>}
 {earlier.length>0&&<details><summary>Earlier songs and other lists ({earlier.length})</summary><p>These songs belong to the favorites shown with each player. Older takes have not passed the new style check.</p>{earlier.map(songCard)}</details>}
 {examples.length>0&&<section aria-label="Example songs"><h3>Example songs</h3><p>These examples were made from the lists shown below. They are separate from your saved favorites.</p>{examples.map(songCard)}</section>}
 {takes.length>0&&<p>Your latest two songs stay available on this Mac. Download the ones you want to keep.</p>}
 <FeedbackSettings/>
 <details><summary>Saved favorites</summary>
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
