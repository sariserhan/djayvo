'use client';
import {useEffect,useState} from 'react';
import {SongFeedback} from './song-feedback';
import languages from '../../../../assets/manifests/dna-languages.json';
type Entry={id:string;title:string;language:string;direction?:string;historical?:boolean;visibility?:string;withdrawn_at?:string;check?:'passed'|'style-mismatch'|'not-checked';product?:string};
export function SongGallery({scope,title,product='music-dna'}:{scope:'examples'|'mine'|'public'|'validation';title:string;product?:'music-dna'|'improvise'}){
 const endpoint=product==='improvise'?'/api/improvise/song':'/api/taste/song';
 const [songs,setSongs]=useState<Entry[]>([]),[next,setNext]=useState<string|null>(null),[message,setMessage]=useState('Loading songs…'),[busy,setBusy]=useState(false);
 const [feedbackAvailable,setFeedbackAvailable]=useState(true),[accountFeedback,setAccountFeedback]=useState(false);
 const [language,setLanguage]=useState(''),[style,setStyle]=useState('');
 async function load(after=''){
  setBusy(true);
  try{
   const response=await fetch(`${endpoint}?view=${scope}${after?'&after='+after:''}`,{signal:AbortSignal.timeout(10000)}),result=await response.json();
   if(!response.ok)throw Error(result.error??'Songs could not load.');
   if(!Array.isArray(result.songs))throw Error('Invalid song collection');
   setSongs(old=>after?[...old,...result.songs]:result.songs);setNext(result.next);setFeedbackAvailable(result.feedbackAvailable!==false);setAccountFeedback(result.accountFeedback===true);
   setMessage(result.signIn?'Sign in to see all your songs.':result.available===false?'This collection will open when credit-backed generation is enabled.':result.songs.length?'':scope==='public'?'Public songs will appear here after successful generation.':'No songs yet. Make your first song above.');
  }catch{setMessage('Songs could not load. Please try again.');}finally{setBusy(false);}
 }
 useEffect(()=>{void load();const refresh=()=>{if(!document.hidden)void load();};
  window.addEventListener('jamloom-dna-completed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=scope==='public'||scope==='validation'?setInterval(refresh,60000):undefined;
  return()=>{clearInterval(timer);window.removeEventListener('jamloom-dna-completed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[scope,product]);
 async function withdraw(id:string){
  setBusy(true);try{const response=await fetch(endpoint+'?id='+id,{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});if(!response.ok)throw Error();await load();window.dispatchEvent(new Event('jamloom-dna-completed'));}catch{setMessage('Could not remove this song from the public page. Try again.');}finally{setBusy(false);}
 }
 return <section className="product-panel" aria-label={title}><h2>{title}</h2>
  <p>{scope==='validation'?'Listen to our test songs. Automated checks do not judge pronunciation or musical quality.':scope==='examples'?'Press play. Original AI songs inspired by example favorites.':scope==='mine'?'All your songs. Private stays private.':'Made by listeners. Shared with everyone.'}</p>
  {scope==='validation'&&<div className="product-actions"><label>Language <select aria-label="Language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="">All languages</option>{[...new Set(songs.map(s=>s.language))].sort().map(code=><option key={code} value={code}>{(languages.languages as Record<string,string>)[code]??code}</option>)}</select></label><label>Style <select aria-label="Style" value={style} onChange={e=>setStyle(e.target.value)}><option value="">All styles</option>{[...new Set(songs.map(s=>s.direction).filter(Boolean))].sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>}
  <div className="dna-song-grid">{songs.filter(song=>(!language||song.language===language)&&(!style||song.direction===style)).map(song=><article key={song.id}><h3>{song.title}</h3><p>{(languages.languages as Record<string,string>)[song.language]??song.language}{song.direction?' · '+song.direction:''}{scope==='mine'?' · '+(song.withdrawn_at?'Removed from public page':song.visibility):''}</p>
   {song.check&&<p>Sample {song.id.slice(0,6)} · {song.product==='improvise'?'Improvise':'Music DNA'} · {song.check==='passed'?'Passed automated style check':song.check==='style-mismatch'?'Test take · style mismatch':'Test take · style not verified'}. This score does not judge lyrics or singing.</p>}
   {song.historical&&<p>Earlier experiment · style match not checked.</p>}
   <audio controls preload="none" aria-label={`Listen to ${song.title}`} src={`${endpoint}?id=${song.id}&file=audio`} onPlay={event=>document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();})}/>
   <div className="product-actions"><a className="secondary" href={`${endpoint}?id=${song.id}&file=audio&download=1`} download>Download song</a>
   {scope==='mine'&&song.visibility==='public'&&!song.withdrawn_at&&<button className="secondary" disabled={busy} onClick={()=>withdraw(song.id)}>Remove from public page</button>}</div>
   {feedbackAvailable&&scope!=='public'&&scope!=='validation'&&!song.historical&&<details><summary>Rate this song</summary><SongFeedback id={song.id} account={accountFeedback}/></details>}
  </article>)}</div>
  <p role="status">{message}</p>{next&&<button className="secondary" disabled={busy} onClick={()=>load(next)}>Load more songs</button>}
  {message.includes('try again')&&<button className="secondary" disabled={busy} onClick={()=>load()}>Retry songs</button>}
  {scope==='mine'&&message.includes('Sign in')&&<a href="/account/sign-in?callbackURL=%2Fmusic-dna">Sign in</a>}
 </section>;
}
