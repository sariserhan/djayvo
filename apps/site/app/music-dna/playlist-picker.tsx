'use client';
import {useEffect,useRef,useState} from 'react';
import type {PlaylistItem} from '../../lib/playlist-import';
import type {TasteSuggestion} from '../../lib/taste-catalogue';
import {exactPlaylistMatch,playlistQuery} from '../../lib/playlist-match';
export function PlaylistPicker({disabled,onSearch,onAdd}:{disabled:boolean;onSearch:(query:string)=>void;onAdd:(songs:TasteSuggestion[])=>void}){
 const [url,setUrl]=useState(''),[items,setItems]=useState<PlaylistItem[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState<boolean|null>(null);
 const controller=useRef<AbortController|null>(null);
 const [matches,setMatches]=useState<Record<string,TasteSuggestion>>({}),[selected,setSelected]=useState<string[]>([]);
 useEffect(()=>{const abort=new AbortController();void fetch('/api/playlist-import',{signal:abort.signal}).then(r=>r.json()).then(data=>setReady(data.youtube===true)).catch(()=>{});return()=>{abort.abort();controller.current?.abort();};},[]);
 async function load(){
  controller.current?.abort();const abort=new AbortController();controller.current=abort;setBusy(true);setItems([]);setMatches({});setSelected([]);setMessage('');
  try{const response=await fetch('/api/playlist-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(12000)])});const data=await response.json();if(!response.ok)throw Error(data.error);setItems(data.items);setMessage(data.items.length?(data.more?'Showing the first 50 playlist entries.':'Choose a song to find its catalogue match.'):'No available songs found in this playlist.');}
  catch(error){if(!abort.signal.aborted)setMessage(error instanceof Error?error.message:'Could not load this playlist.');}
  finally{if(controller.current===abort){controller.current=null;setBusy(false);}}
 }
 async function findMatches(){
  const abort=new AbortController();controller.current=abort;setBusy(true);setMessage('Finding matching songs…');const found:Record<string,TasteSuggestion>={};let index=0;
  await Promise.all(Array.from({length:3},async()=>{
   while(index<Math.min(20,items.length)&&!abort.signal.aborted){
    const item=items[index++];
    try{const response=await fetch('/api/music-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:playlistQuery(item.title)}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(8000)])});if(!response.ok)continue;const data=await response.json();if(!Array.isArray(data.suggestions))continue;const match=exactPlaylistMatch(item.title,data.suggestions);if(match)found[item.url]=match;}catch{/* Unmatched titles remain available for manual song selection. */}
   }
  }));
  if(abort.signal.aborted)return;
  setMatches(found);setSelected(Object.keys(found));setMessage(Object.keys(found).length?'Review the matched songs, then add them to your favorites.':'No exact catalogue matches found. Use “Find song” to choose each match.');setBusy(false);controller.current=null;
 }
 return <details className="dna-playlist-picker"><summary>Use a playlist</summary>
 <p>Find favorites from a YouTube playlist, then choose their song matches below.</p>
 <label htmlFor="dna-playlist-url">YouTube playlist link</label>
 <div className="product-actions"><input id="dna-playlist-url" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" disabled={disabled||busy}/><button className="secondary" disabled={disabled||busy||!url.trim()||ready===false} onClick={load}>{busy?'Loading playlist…':'Show songs'}</button></div>
 {ready===false&&<p>YouTube connection is not available here yet. Search for your favorites below.</p>}
 <p role="status">{message}</p>
 {items.length>0&&<><button className="secondary" disabled={disabled||busy} onClick={findMatches}>{busy?'Finding songs…':'Match first 20 songs'}</button><ul>{items.map(item=><li key={item.url}><div><a href={item.url} target="_blank" rel="noreferrer">{item.title} · YouTube ↗</a>{matches[item.url]&&<label><input type="checkbox" checked={selected.includes(item.url)} disabled={disabled||busy} onChange={e=>setSelected(old=>e.target.checked?[...old,item.url]:old.filter(u=>u!==item.url))}/>{matches[item.url].reference} · iTunes</label>}</div><button className="secondary" disabled={disabled||busy} onClick={()=>onSearch(playlistQuery(item.title))}>Find song</button></li>)}</ul>
 <div className="product-actions">{selected.length>0&&<button className="primary" disabled={disabled||busy} onClick={()=>{onAdd(selected.map(url=>matches[url]));setSelected([]);}}>Add {selected.length} favorites</button>}<button className="secondary" disabled={busy} onClick={()=>{setItems([]);setMatches({});setSelected([]);setMessage('');setUrl('');}}>Clear playlist preview</button></div></>}
 <small>Spotify connection is not available yet. Playlist previews stay in this tab and are not used to train models.</small>
 </details>;
}
