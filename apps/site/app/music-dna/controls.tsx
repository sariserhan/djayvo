'use client';
import {useEffect,useRef,useState} from 'react';
import {emptyTaste,validateTaste,type Taste} from '../../lib/taste';
import {automaticTaste,favoriteList,resolveFavoriteMetadata} from '../../lib/taste-auto';
import {favoriteKey,musicDirection,type FavoriteSnapshot} from '../../lib/taste-direction';
import languages from '../../../../assets/manifests/dna-languages.json';
import {SongFeedback,FeedbackSettings,listenerHeaders} from './song-feedback';
import {FavoriteSearch} from './favorite-search';
import {PlaylistPicker} from './playlist-picker';
import {tasteCatalogue,type ReferenceMetadata} from '../../lib/taste-catalogue';
import {GenerationProgress,type SongProgress} from '../generation-progress';
type SongPlan={language?:{code:string;label:string;basis:string};musical_traits?:Record<string,string>;title:string;summary:string;favorites?:{reference:string}[];influences:{reference:string;basis:string;description:string}[];cases:{lyrics:string;song_caption:string;bpm:number;voice:string}[]};
type Song={id:string;state:string;phase?:string;message:string;plan?:SongPlan;profile?:FavoriteSnapshot;direction?:{label:string};legacy?:boolean;styleChecked?:boolean};
const songUrl=(id:string)=>`/api/taste/song?id=${id}`;
const pendingKey='jamloom-dna-pending';
export function TasteNotebook(){
 const [profile,setProfile]=useState<Taste>(emptyTaste),[message,setMessage]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [rendering,setRendering]=useState(false),[search,setSearch]=useState(''),[job,setJob]=useState<string|null>(null),[draft,setDraft]=useState<SongPlan|null>(null);
 const [takes,setTakes]=useState<Song[]>([]);
 const [playlistQuery,setPlaylistQuery]=useState<{text:string}|null>(null);
 const [progress,setProgress]=useState<SongProgress|null>(null);
 const [cloud,setCloud]=useState(false);
 const [visibility,setVisibility]=useState<'public'|'private'>('public'),[publicConsent,setPublicConsent]=useState(false);
 const [quote,setQuote]=useState<{credits:number;token:string;expiresAt:number;key:string}|null>(null);
 const requestId=useRef<string|null>(null),prompt=useRef<HTMLDialogElement>(null),generationButton=useRef<HTMLButtonElement>(null);
 const submittingCloud=useRef<string|null>(null),cancelWanted=useRef(false);
 const [promptOpen,setPromptOpen]=useState(false);
 useEffect(()=>{if(promptOpen)prompt.current?.showModal();else prompt.current?.close();},[promptOpen]);
 function openPrompt(){setPublicConsent(false);setMessage('');setProgress(null);setPromptOpen(true);}
 async function dismissPrompt(){if(analysis.current)await cancel();setPromptOpen(false);}
 const snapshot={references:profile.references,referenceMetadata:profile.referenceMetadata??[],vocalLanguage:profile.vocalLanguage},direction=musicDirection(snapshot);
 const current=takes.filter(s=>s.styleChecked&&s.profile&&favoriteKey(s.profile)===favoriteKey(snapshot));
 const earlier=takes.filter(s=>!current.includes(s));
 const taste=automaticTaste(profile),locked=busy||rendering;
 const selectionKey=favoriteKey(snapshot)+':'+visibility;
 const generationPrice=quote?.key===selectionKey?quote.credits:visibility==='public'?1:2;
 useEffect(()=>{setQuote(null);requestId.current=null;},[selectionKey]);
 const analysis=useRef<AbortController|null>(null),writable=useRef(false),mounted=useRef(true);
 useEffect(()=>{try{const old=localStorage.getItem('jamloom-taste-v1');if(old)setProfile(favoriteList(validateTaste(JSON.parse(old))));writable.current=true;}catch{setMessage('Saved favorites could not be read. You can start a new list.');}finally{setLoaded(true);}},[]);
 useEffect(()=>{if(!loaded||!writable.current)return;try{if(profile.references.length)localStorage.setItem('jamloom-taste-v1',JSON.stringify(profile));else localStorage.removeItem('jamloom-taste-v1');}catch{setMessage('Your list is available for this session, but this browser could not save it.');}},[profile,loaded]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;analysis.current?.abort();};},[]);
 useEffect(()=>{void fetch('/api/taste/song',{signal:AbortSignal.timeout(10000)}).then(r=>r.json()).then(data=>{if(mounted.current&&data.mode==='cloud'){setCloud(true);if(data.active){setJob(data.active);setRendering(true);}}}).catch(()=>{});},[]);
 useEffect(()=>{
  let stopped=false;
  void (async()=>{
   try{
    const pending=localStorage.getItem(pendingKey);if(pending&&/^[a-f0-9]{32}$/.test(pending)){setJob(pending);setRendering(true);}
    const history=JSON.parse(localStorage.getItem('jamloom-dna-songs-v1')??'[]');
    const saved=(Array.isArray(history)?history:[]).slice(-2).map((id:string)=>({id,example:false}));
    for(const {id,example} of saved)if(typeof id==='string'&&/^[a-f0-9]{32}$/.test(id)){
     const response=await fetch(songUrl(id),{signal:AbortSignal.timeout(10000)});if(!response.ok)continue;
     const song:Song=await response.json();if(stopped)return;
     if(song.state==='completed')setTakes(old=>[...old.filter(s=>s.id!==id),song].slice(example?-6:-2));
     else if(['queued','running'].includes(song.state)&&!example){setJob(id);setRendering(true);setProgress(song);}
    }
   }catch{/* Favorites remain independent of song-history availability. */}
  })();return()=>{stopped=true;};
 },[]);
 useEffect(()=>{
  if(!job)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;const checkingUntil=Date.now()+60000;
  const controller=new AbortController();
  const poll=async()=>{
   try{
    const response=await fetch(songUrl(job),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    const song=await response.json();if(stopped)return;
    if(!response.ok){if(response.status===404&&Date.now()<checkingUntil)throw Error();if(response.status===404||response.status===409){setRendering(false);setJob(null);setProgress({state:'failed'});setMessage(song.error??'This song is unavailable. Your favorites are safe.');return;}throw Error(song.error);}
    let cancelPending=cancelWanted.current;try{cancelPending ||= localStorage.getItem(pendingKey+'-cancel')===job;}catch{}
    if(cancelPending&&['queued','running'].includes(song.state)){const cancelled=await fetch(songUrl(job),{method:'DELETE',headers:{'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(10000)});if(!cancelled.ok)throw Error();}
    setProgress({state:song.cancelling?'cancelling':song.state,phase:song.phase});setMessage('');if(song.plan)setDraft(song.plan);
    if(!['queued','running'].includes(song.state)){
     setRendering(false);setJob(null);requestId.current=null;setQuote(null);
     cancelWanted.current=false;try{if(localStorage.getItem(pendingKey)===job)localStorage.removeItem(pendingKey);if(localStorage.getItem(pendingKey+'-cancel')===job)localStorage.removeItem(pendingKey+'-cancel');}catch{}
     if(song.state==='completed'){setTakes(old=>[...old.filter(s=>s.id!==job),song].slice(-2));requestId.current=null;setQuote(null);window.dispatchEvent(new Event('jamloom-dna-completed'));}
     return;
    }
   }catch{if(stopped)return;setProgress({state:'reconnecting'});setMessage('');}
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
 function addPlaylist(songs:import('../../lib/taste-catalogue').TasteSuggestion[]){
  let next={...profile,references:[...profile.references],referenceMetadata:[...(profile.referenceMetadata??[])]};let added=0;
  for(const song of songs){
   if(next.references.length>=20)break;
   if(!song.metadata||next.references.some(r=>r.normalize('NFKC').toLowerCase()===song.reference.normalize('NFKC').toLowerCase()))continue;
   next={...next,references:[...next.references,song.reference],referenceMetadata:[...next.referenceMetadata,song.metadata]};added++;
  }
  try{const valid=favoriteList(validateTaste(next));writable.current=true;setProfile(valid);setMessage(`${added} favorites added.${valid.references.length===20?' Your list is full at 20 songs.':''}`);}catch{setMessage('The selected songs could not be added. Your list is unchanged.');}
 }
 async function cancel(){
  if(submittingCloud.current){cancelWanted.current=true;try{localStorage.setItem(pendingKey+'-cancel',submittingCloud.current);}catch{}setProgress({state:'cancelling'});return;}
  analysis.current?.abort();analysis.current=null;
  if(job){
   try{const response=await fetch(songUrl(job),{method:'DELETE',headers:{'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error);if(['queued','running'].includes(result.state)){setProgress({state:'cancelling'});return;}setJob(null);}
   catch(error){setMessage(error instanceof Error?error.message:'Could not stop the song.');return;}
  }
  setRendering(false);setProgress({state:'cancelled'});requestId.current=null;setQuote(null);setMessage('');
 }
 async function generate(){
  if(analysis.current||job)return;
  let cloudRequest:string|null=null;const controller=new AbortController();analysis.current=controller;setRendering(true);setDraft(null);setProgress({state:'running',phase:'preparing'});setMessage('');
  cancelWanted.current=false;
  try{
   if(!profile.references.length)throw Error('Add at least one favorite first.');
   const available=await fetch('/api/taste/song',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   const readiness=await available.json();if(!available.ok)throw Error(readiness.error);
   if(readiness.creditsEnabled===false)throw Error('Credit-backed generation is not enabled here yet. Listen to the examples below.');
   if(readiness.signedIn===false)throw Error('Sign in with a verified account to use your credits.');
   if(readiness.active||readiness.busy)throw Error('Your other song is still being made. Your favorites are saved; try again when it finishes.');
   const resolved=await resolveFavoriteMetadata(profile,controller.signal);controller.signal.throwIfAborted();setProfile(resolved);
   if(visibility==='public'&&!publicConsent)throw Error('Agree to public sharing or choose Private.');
   const key=favoriteKey({...resolved,referenceMetadata:resolved.referenceMetadata??[]})+':'+visibility;
   let accepted=quote?.key===key&&quote.expiresAt>Date.now()?quote:null;
   if(!accepted){
    const priced=await fetch('/api/taste/song',{method:'POST',headers:{'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:JSON.stringify({action:'quote',profile:resolved,visibility,publicConsent}),signal:controller.signal});
    const price=await priced.json();if(!priced.ok)throw Error(price.error);
    accepted={...price,key};setQuote(accepted);
    if(price.credits>(visibility==='public'?1:2)){setRendering(false);setProgress(null);setMessage(`This song needs ${price.credits} credits to cover its generation cost. Review the new price, then confirm the new price to accept it.`);return;}
   }
   controller.signal.throwIfAborted();
   requestId.current??=crypto.randomUUID().replaceAll('-','');
   if(readiness.mode==='cloud'){cloudRequest=requestId.current;submittingCloud.current=cloudRequest;setCloud(true);setJob(cloudRequest);setPromptOpen(false);try{localStorage.setItem(pendingKey,cloudRequest);}catch{}}
   // Retain the same request id if the response is lost; retries cannot charge or generate twice.
   const response=await fetch('/api/taste/song',{method:'POST',headers:{'Content-Type':'application/json','X-Jamloom-DNA':'1',...listenerHeaders()},body:JSON.stringify({action:'submit',profile:resolved,visibility,publicConsent,token:accepted!.token,requestId:requestId.current}),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok){if(response.status<500){cloudRequest=null;setJob(null);try{localStorage.removeItem(pendingKey);}catch{}}throw Error(result.error);}
   if(!mounted.current){if(cloudRequest)try{localStorage.setItem('jamloom-dna-songs-v1',JSON.stringify([result.id]));}catch{}return;}
   if(controller.signal.aborted){await fetch(songUrl(result.id),{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});return;}
   setPromptOpen(false);setJob(result.id);setProgress({state:result.state??'running',phase:result.phase??'preparing'});setMessage('');
  }catch(error){if(cloudRequest&&mounted.current&&!controller.signal.aborted){setPromptOpen(false);setJob(cloudRequest);setProgress({state:'reconnecting'});return;}if(!controller.signal.aborted&&mounted.current){setRendering(false);setProgress({state:'failed'});setMessage(error instanceof Error?error.message:'Unable to make this song.');}}
  finally{submittingCloud.current=null;if(analysis.current===controller)analysis.current=null;}
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
 <audio aria-label={`Play ${take.plan?.title??`song ${i+1}`}`} controls preload="metadata" src={`${songUrl(take.id)}&file=audio`} onPlay={event=>{document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}} onError={()=>setMessage('This song could not load. Your favorites are safe. Reload to reconnect.')}/>
 <div className="product-actions"><a className="secondary" href={`${songUrl(take.id)}&file=audio&download=1`} download>Download song</a><a className="secondary" href={`${songUrl(take.id)}&file=plan`} download>Download song notes</a></div>
 {take.styleChecked&&<SongFeedback id={take.id} account={cloud}/>}
 {take.plan?.musical_traits&&<details><summary>The musical choices</summary><dl>{Object.entries(take.plan.musical_traits).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{value}</dd></div>)}</dl></details>}
 {take.plan&&<><details><summary>Lyrics</summary><p style={{whiteSpace:'pre-wrap'}}>{take.plan.cases[0].lyrics}</p></details><details><summary>How these favorites shaped this song</summary><p>{take.plan.summary}</p><ul>{take.plan.influences.map(note=><li key={note.reference}><strong>{note.reference}</strong>: {note.description} {note.basis==='unknown'?'(Unrecognized)':note.basis==='genre_only'?'(Catalogue genre only)':'(Model interpretation)'}</li>)}</ul><p>{take.plan.cases[0].song_caption}</p><p>Musical direction uses catalogue metadata and model interpretation, not analysis of the original recordings. A style check cannot guarantee musical quality.</p></details></>}
 </article>;}
 return <section id="dna-notebook" className="product-panel">
 <ol className="dna-steps" aria-label="How Music DNA works"><li><span>1</span> Pick favorites</li><li><span>2</span> We find your sound</li><li><span>3</span> Get a song</li></ol>
 <div className="product-controls">
 <div className="dna-create-grid"><div className="dna-picker"><div className="dna-picker-heading"><h2>Your favorite music</h2><span>{profile.references.length} selected</span></div>
 <PlaylistPicker disabled={locked||!loaded} onSearch={text=>setPlaylistQuery({text})} onAdd={addPlaylist}/>
 <FavoriteSearch saved={profile.references} disabled={locked||!loaded} onSelect={(reference,metadata)=>{addSong(reference,metadata);setPlaylistQuery(null);}} playlistQuery={playlistQuery}/>
 <div className="dna-favorites">{[...new Set(profile.references)].map(reference=><div className="dna-favorite" role="group" aria-label={reference} key={reference}>
  <span className="dna-favorite-icon" aria-hidden="true">♫</span><strong>{reference}</strong><button className="secondary" disabled={locked} aria-label={`Remove favorite ${reference}`} onClick={()=>remove(reference)}>×</button>
  <details><summary>Listen elsewhere</summary><div className="product-actions"><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on YouTube ↗</a><a href={`https://open.spotify.com/search/${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">Find on Spotify ↗</a></div></details>
 </div>)}</div>
 {!profile.references.length&&<div className="dna-empty"><span aria-hidden="true">♫ + ♫ + ♫</span><p>Add the music you keep coming back to.</p></div>}
 <small className="dna-autosave">Favorites save on this device.</small>
 </div><div className="dna-next-song">
 <div className="dna-record-art" aria-hidden="true"><div className="demo-record"><span>J</span></div><div className="dna-sound-bars">{[28,52,36,72,96,60,40,80,56,32,64,40].map((height,i)=><i key={i} style={{height:height+'%'}}/>)}</div></div>
 <div className="dna-summary"><h3>{profile.references.length?'Your music DNA':'Your next favorite?'}</h3>
 {taste.genres.length?<div className="dna-genre-tags">{taste.genres.map(g=><span key={g.name}>{g.name}</span>)}</div>:<p>{profile.references.length?'We’ll find your sound from your list.':'An original song with AI vocals, inspired by your favorites.'}</p>}
 {profile.references.length>0&&<details><summary>How we choose your sound</summary>{direction&&<p><strong>Song direction: {direction.label}</strong> · {direction.energy}. Based on {direction.coverage} of {direction.total} favorites with recognized catalogue genres.</p>}<p>We consider your whole list to choose a groove, instruments, mood and vocal delivery, then write original lyrics and music.</p><p>Catalogue genres and the model’s knowledge guide this interpretation. We don’t listen to or sample the original recordings, and unfamiliar names may not provide enough information.</p></details>}</div>
 <button ref={generationButton} className="primary" disabled={locked||!loaded||!profile.references.length} onClick={openPrompt}>{rendering?'Making your music…':takes.length?'Make another song':'Make my music'}</button>
 {progress&&!promptOpen&&<GenerationProgress {...progress}/>}
 {rendering&&!promptOpen&&<button className="secondary" onClick={cancel}>Cancel composition</button>}
 <small>One song each time · Ready in a few minutes</small>
 <details className="dna-language"><summary>Song language <span>{(languages.languages as Record<string,string>)[profile.vocalLanguage??'auto']??'Automatic'}</span></summary>
 <label>Singing language<select disabled={locked||!loaded} value={profile.vocalLanguage??'auto'} onChange={e=>{writable.current=true;setProfile({...profile,vocalLanguage:e.target.value});}}><option value="auto">Choose from my favorites</option>{Object.entries(languages.languages).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
 <details><summary>How language is chosen</summary><p>Automatic language follows your favorites, with a small boost for matching languages in your approximate country. English-only favorites stay English wherever you are. Choose a language above to keep it fixed.</p></details></details>
 </div></div>
 {!promptOpen&&<p role="status">{message}</p>}
 <dialog ref={prompt} className="dna-generation-dialog" aria-labelledby="dna-generation-title" onCancel={event=>{event.preventDefault();void dismissPrompt();}} onClose={()=>{setPromptOpen(false);generationButton.current?.focus();}}>
 <h2 id="dna-generation-title">Make your song</h2><p>Choose who can listen before using your credits.</p><div className="product-controls">
 <fieldset disabled={locked}><legend>Who can listen?</legend>
 <label><input type="radio" name="dna-visibility" checked={visibility==='public'} onChange={()=>{setVisibility('public');setQuote(null);requestId.current=null;}}/>Public · from 1 credit</label><p>Share your song on the homepage and Music DNA. Your favorites and account stay private.</p>
 <label><input type="radio" name="dna-visibility" checked={visibility==='private'} onChange={()=>{setVisibility('private');setPublicConsent(false);setQuote(null);requestId.current=null;}}/>Private · from 2 credits</label><p>Only you can listen or download.</p>
 {visibility==='public'&&<label><input type="checkbox" checked={publicConsent} onChange={e=>setPublicConsent(e.target.checked)}/>I agree to publish this new song on the community page.</label>}
 </fieldset>
 <p>{quote&&quote.key===favoriteKey(snapshot)+':'+visibility?`This song: ${quote.credits} ${quote.credits===1?'credit':'credits'}.`:`Starting price: ${visibility==='public'?'1 credit':'2 credits'}.`} Higher costs need your approval. Failed or cancelled songs return your credits.</p>
 <p><a href="/account/sign-in?callbackURL=%2Fmusic-dna">Sign in</a> · <a href="/account/credits">Your credits</a>. {cloud?'Your song keeps processing if you leave this page.':'Local test credits only. Paid generation is not open.'}</p>
 <div className="product-actions"><button className="primary" disabled={locked||(visibility==='public'&&!publicConsent)} onClick={generate}>{rendering?'Preparing your song…':`Generate song · ${generationPrice} ${generationPrice===1?'credit':'credits'}`}</button><button className="secondary" onClick={dismissPrompt}>{rendering?'Cancel composition':'Cancel'}</button></div>
 {progress&&promptOpen&&<GenerationProgress {...progress}/>}
 {promptOpen&&<p role="status">{message}</p>}
 </div></dialog>
 {draft&&rendering&&<div><h3>{draft.title}</h3>{draft.favorites&&<p><strong>Making a song from:</strong> {draft.favorites.map(f=>f.reference).join(' · ')}</p>}<p>{draft.summary}</p></div>}
 {current.length>0&&<section aria-label="Songs for this list"><h3>Songs for this list</h3>{current.map(songCard)}</section>}
 {earlier.length>0&&<details><summary>Earlier songs and other lists ({earlier.length})</summary><p>These songs belong to the favorites shown with each player. Older takes have not passed the new style check.</p>{earlier.map(songCard)}</details>}
 {takes.length>0&&<p>Your latest two results appear here. Your account’s full collection is in Your songs below.</p>}
 <div className="dna-tools"><FeedbackSettings account={cloud}/>
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
 </details></div>
 </div></section>;
}
