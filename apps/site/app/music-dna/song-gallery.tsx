'use client';
import {useEffect,useState} from 'react';
import {SongFeedback} from './song-feedback';
import languages from '../../../../assets/manifests/dna-languages.json';
type Entry={id:string;title:string;language:string;direction?:string;historical?:boolean;visibility?:string;withdrawn_at?:string};
export function SongGallery({scope,title}:{scope:'examples'|'mine'|'public';title:string}){
 const [songs,setSongs]=useState<Entry[]>([]),[next,setNext]=useState<string|null>(null),[message,setMessage]=useState('Loading songs…'),[busy,setBusy]=useState(false);
 async function load(after=''){
  setBusy(true);
  try{
   const response=await fetch(`/api/taste/song?view=${scope}${after?'&after='+after:''}`,{signal:AbortSignal.timeout(10000)}),result=await response.json();
   if(!response.ok)throw Error(result.error??'Songs could not load.');
   if(!Array.isArray(result.songs))throw Error('Invalid song collection');
   setSongs(old=>after?[...old,...result.songs]:result.songs);setNext(result.next);
   setMessage(result.signIn?'Sign in to see all your songs.':result.available===false?'This collection will open when credit-backed generation is enabled.':result.songs.length?'':scope==='public'?'Public songs will appear here after successful generation.':'No songs yet. Make your first song above.');
  }catch{setMessage('Songs could not load. Please try again.');}finally{setBusy(false);}
 }
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('jamloom-dna-completed',refresh);return()=>window.removeEventListener('jamloom-dna-completed',refresh);},[scope]);
 async function withdraw(id:string){
  setBusy(true);try{const response=await fetch('/api/taste/song?id='+id,{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});if(!response.ok)throw Error();await load();window.dispatchEvent(new Event('jamloom-dna-completed'));}catch{setMessage('Could not remove this song from the public page. Try again.');}finally{setBusy(false);}
 }
 return <section className="product-panel" aria-label={title}><h2>{title}</h2>
  <p>{scope==='examples'?'Original songs made while developing Music DNA. These examples use the sample lists chosen for each song.':scope==='mine'?'Your public and private songs. Private songs are only available to your signed-in account.':'Original songs listeners chose to share. Their favorite lists and account details stay private.'}</p>
  <div className="dna-song-grid">{songs.map(song=><article key={song.id}><h3>{song.title}</h3><p>{(languages.languages as Record<string,string>)[song.language]??song.language}{song.direction?' · '+song.direction:''}{scope==='mine'?' · '+(song.withdrawn_at?'Removed from public page':song.visibility):''}</p>
   {song.historical&&<p>Earlier experiment · style match not checked.</p>}
   <audio controls preload="none" aria-label={`Listen to ${song.title}`} src={`/api/taste/song?id=${song.id}&file=audio`} onPlay={event=>document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();})}/>
   <div className="product-actions"><a className="secondary" href={`/api/taste/song?id=${song.id}&file=audio&download=1`} download>Download song</a>
   {scope==='mine'&&song.visibility==='public'&&!song.withdrawn_at&&<button className="secondary" disabled={busy} onClick={()=>withdraw(song.id)}>Remove from public page</button>}</div>
   {scope!=='public'&&!song.historical&&<details><summary>Rate this song</summary><SongFeedback id={song.id}/></details>}
  </article>)}</div>
  <p role="status">{message}</p>{next&&<button className="secondary" disabled={busy} onClick={()=>load(next)}>Load more songs</button>}
  {message.includes('try again')&&<button className="secondary" disabled={busy} onClick={()=>load()}>Retry songs</button>}
  {scope==='mine'&&message.includes('Sign in')&&<a href="/account/sign-in?callbackURL=%2Fmusic-dna">Sign in</a>}
 </section>;
}
