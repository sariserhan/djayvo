'use client';
import {useState} from 'react';
import {PlayTrack} from './player';
import catalogue from '../../../assets/manifests/aurowall-public.json';
export function AurowallMusic(){
 const tracks=catalogue.tracks;
 const [selected,setSelected]=useState('');
 const track=tracks.find(t=>t.id===selected)??tracks[0];
 return <section className="aurowall-section" aria-labelledby="aurowall-heading"><div><p className="eyebrow">In partnership with Aurowall</p><h2 id="aurowall-heading">Find your next soundtrack.</h2><p>Explore Aurowall’s music collection. Listen here, or mix tracks up to 20 minutes long in the DJ studio.</p><a href="https://aurowall.com" target="_blank" rel="noopener noreferrer">Meet Aurowall ↗</a></div><div className="aurowall-controls">
  {track?<><label htmlFor="aurowall-track">Choose your sound</label><select id="aurowall-track" value={track.id} onChange={event=>setSelected(event.target.value)}>{tracks.map(t=><option key={t.id} value={t.id}>{t.title} · {t.genre}</option>)}</select><div className="product-actions"><PlayTrack track={track}/><a href="/studio/dj.html">Mix in DJ Studio ↗</a></div><p className="muted">{tracks.length} tracks · Online listening · Playback starts when you press Play.</p></>:<p role="status">No tracks are available yet.</p>}
 </div></section>;
}
