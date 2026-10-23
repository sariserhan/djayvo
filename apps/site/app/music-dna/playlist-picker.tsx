'use client';
import {useEffect,useRef,useState} from 'react';
import type {PlaylistItem} from '../../lib/playlist-import';
import type {TasteSuggestion} from '../../lib/taste-catalogue';
import {playlistQuery} from '../../lib/playlist-match';
import {playlistTaste,type PlaylistProgress} from '../../lib/playlist-taste';
export function PlaylistPicker({disabled,onSearch,onAdd,onBusy}:{disabled:boolean;onSearch:(query:string)=>void;onAdd:(songs:TasteSuggestion[])=>void;onBusy:(busy:boolean)=>void}){
 const [url,setUrl]=useState(''),[unmatched,setUnmatched]=useState<PlaylistItem[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState<boolean|null>(null),[progress,setProgress]=useState<PlaylistProgress|null>(null);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{const abort=new AbortController();void fetch('/api/playlist-import',{signal:abort.signal}).then(r=>r.json()).then(data=>setReady(data.youtube===true)).catch(()=>{});return()=>{abort.abort();controller.current?.abort();};},[]);
 async function load(){
  if(controller.current)return;const abort=new AbortController();controller.current=abort;setBusy(true);onBusy(true);setUnmatched([]);setMessage('');setProgress(null);
  try{
   const result=await playlistTaste(url,abort.signal,setProgress);abort.signal.throwIfAborted();
   if(result.songs.length)onAdd(result.songs);setUnmatched(result.unmatched);
   setMessage(`Checked ${result.read} available playlist entries. ${result.songs.length} unique songs matched and added to your taste.${result.unmatched.length?` ${result.unmatched.length} could not be identified and ${result.unmatched.length===1?'was':'were'} not added.`:''}${result.skipped?` ${result.skipped} unavailable or repeated ${result.skipped===1?'entry':'entries'} skipped.`:''}${result.unmatched.length>result.read/2?' Most entries need a match. Review them for a more accurate taste.':''}`);
  }catch(error){if(!abort.signal.aborted)setMessage(error instanceof Error?error.message:'Could not finish the playlist. Your favorites have not changed.');}
  finally{if(controller.current===abort){controller.current=null;setBusy(false);onBusy(false);setProgress(null);}}
 }
 function cancel(){controller.current?.abort();setMessage('Playlist check cancelled. Your favorites have not changed.');}
 return <details className="dna-playlist-picker"><summary>Use a playlist</summary>
 <p>Paste your YouTube playlist. We’ll find the songs and build your music taste automatically.</p>
 <label htmlFor="dna-playlist-url">YouTube playlist link</label>
 <div className="product-actions"><input id="dna-playlist-url" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" disabled={disabled||busy}/><button className="secondary" disabled={disabled||busy||!url.trim()||ready===false} onClick={load}>{busy?'Understanding your playlist…':'Use this playlist'}</button>{busy&&<button className="secondary" onClick={cancel}>Cancel playlist check</button>}</div>
 {ready===false&&<p>YouTube connection is not available here yet. Search for your favorites below.</p>}
 <p role="status">{progress?progress.phase==='reading'?`Reading your whole playlist… ${progress.read} songs found.`:progress.phase==='waiting'?`Waiting for the song catalogue. We’ll continue automatically. ${progress.checked} of ${progress.read} checked.`:`Finding your music taste… ${progress.checked} of ${progress.read} checked, ${progress.matched} matched.`:message}</p>
 {busy&&progress&&progress.phase!=='reading'&&<progress aria-label="Playlist songs checked" max={Math.max(1,progress.read)} value={progress.checked}/>}
 {unmatched.length>0&&<details><summary>{unmatched.length} {unmatched.length===1?'song needs':'songs need'} a match</summary><ul>{unmatched.map(item=><li key={item.url}><span>{item.title}</span><button className="secondary" disabled={disabled||busy} onClick={()=>onSearch(playlistQuery(item.title))}>Find song</button></li>)}</ul></details>}
 <small>Public or unlisted playlists. We interpret catalogue metadata, not the original audio. Larger playlists take longer. Keep this page open while we work.</small>
 </details>;
}
