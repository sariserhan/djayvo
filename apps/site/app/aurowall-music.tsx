'use client';
import {useEffect,useState} from 'react';
import {PlayTrack} from './player';
import type {AurowallTrack} from '../lib/aurowall';
export function AurowallMusic(){
 const [tracks,setTracks]=useState<AurowallTrack[]>([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('Loading Aurowall music…'),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setStatus('Loading Aurowall music…');void fetch('/api/aurowall',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();setTracks(data.tracks);setStatus(data.tracks.length?'':'No tracks are available yet.');}).catch(()=>{if(!controller.signal.aborted)setStatus('Music is unavailable right now. Please try again.');});return()=>controller.abort();},[retry]);
 const track=tracks.find(t=>t.id===selected)??tracks[0];
 return <section className="aurowall-section" aria-labelledby="aurowall-heading"><div><p className="eyebrow">In partnership with Aurowall</p><h2 id="aurowall-heading">Find your next soundtrack.</h2><p>Explore Aurowall’s music collection. Listen here, or mix tracks up to 20 minutes long in the DJ studio.</p><a href="https://aurowall.com" target="_blank" rel="noopener noreferrer">Meet Aurowall ↗</a></div><div className="aurowall-controls">
  {track?<><label htmlFor="aurowall-track">Choose your sound</label><select id="aurowall-track" value={track.id} onChange={event=>setSelected(event.target.value)}>{tracks.map(t=><option key={t.id} value={t.id}>{t.title} · {t.genre}</option>)}</select><div className="product-actions"><PlayTrack track={track}/><a href="/studio/dj.html">Mix in DJ Studio ↗</a></div><p className="muted">{tracks.length} tracks · Online listening · Playback starts when you press Play.</p></>:<><p role="status">{status}</p>{status.includes('unavailable')&&<button className="secondary" onClick={()=>setRetry(retry+1)}>Retry music</button>}</>}
 </div></section>;
}
