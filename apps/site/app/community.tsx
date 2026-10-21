'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import LoadingState from './loading-state';
import {PlayTrack} from './player';
import type {PublicTrack} from '../lib/catalogue';

export function CommunityMusic(){
 const [tracks,setTracks]=useState<PublicTrack[]>([]),[status,setStatus]=useState('Loading community music…');
 useEffect(()=>{let active=true,inFlight=false;const controller=new AbortController();
  async function refresh(){if(document.hidden||inFlight)return;inFlight=true;try{const response=await fetch('/api/catalogue?sort=latest',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();if(active){setTracks(data.tracks);setStatus(data.tracks.length?'':'The first releases start with you.');}}
   catch{if(active){setTracks([]);setStatus('Community music is unavailable right now. Try again shortly.');}}finally{inFlight=false;}}
  void refresh();const timer=setInterval(()=>void refresh(),60000);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 return <section className="community-section" aria-labelledby="community-heading"><div className="section-heading"><div><p className="eyebrow">Made here. Heard here.</p><h2 id="community-heading">The community, on repeat.</h2></div><Link prefetch={false} href="/catalogue">Explore music ↗</Link></div>
  <p className="section-caption">Fresh, reviewed public creations. Your private mixes never appear here.</p>
  {status==='Loading community music…'?<LoadingState label={status}/>:tracks.length?<div className="community-grid">{tracks.map((track,i)=><article className="community-track" key={track.id}><div className={`record-art art-${i%4}`} aria-hidden="true"><div className="cover-disc"/><span>{track.strategy.replaceAll('_',' ')}</span></div><div className="track-card-heading"><div><h3><Link prefetch={false} href={`/catalogue/${track.id}`}>{track.title}</Link></h3><p>{track.artist}</p></div><PlayTrack track={track} queue={tracks}/></div><p className="muted">{track.mood} · {Math.round(track.duration_ms/1000)} sec</p></article>)}</div>:<div className="community-empty"><div className="empty-records" aria-hidden="true"><i/><i/><i/></div><div><h3 role="status">{status}</h3><p>Create a mix, choose public, and submit it for listening review.</p><Link prefetch={false} className="text-button" href="/improvise">Make something to share ↗</Link></div></div>}
 </section>;
}
