'use client';
import { createContext, useContext, useRef, useState } from 'react';
import type { PublicTrack } from '../lib/catalogue';
type PlayableTrack=Pick<PublicTrack,'id'|'title'|'artist'>&{url?:string};
const PlayerContext=createContext<(track:PlayableTrack,queue?:PlayableTrack[])=>void>(()=>{});
export function MusicPlayer({children}:{children:React.ReactNode}) {
  const audio=useRef<HTMLAudioElement>(null), queue=useRef<PlayableTrack[]>([]), index=useRef(0);
  const [current,setCurrent]=useState<PlayableTrack|null>(null),[error,setError]=useState('');
  function play(track:PlayableTrack,list=[track]) {
    queue.current=list;index.current=Math.max(0,list.findIndex(t=>t.id===track.id));setCurrent(track);setError('');
    if(audio.current){audio.current.src=track.url&&/^\/api\/aurowall\/[a-f0-9]{24}$/.test(track.url)?track.url:`/api/catalogue/${encodeURIComponent(track.id)}/audio`;void audio.current.play().catch(()=>setError('Playback could not start. Try the play control.'));}
  }
  return <PlayerContext.Provider value={play}>{children}<aside className="music-player" hidden={!current} aria-label="Music player">
    <div><strong>{current?.title}</strong><span className="muted">{current?.artist}</span></div>
    <audio ref={audio} controls preload="none" aria-label="Catalogue player" onError={()=>setError('This track is unavailable or has been withdrawn.')} onEnded={()=>{const next=queue.current[index.current+1];if(next)play(next,queue.current);}}/>
    <button className="text-button" onClick={()=>{audio.current?.pause();audio.current?.removeAttribute('src');audio.current?.load();setCurrent(null);}}>Close player</button>
    <p role="alert">{error}</p>
  </aside></PlayerContext.Provider>;
}
export function PlayTrack({track,queue}:{track:PlayableTrack;queue?:PlayableTrack[]}) {
  const play=useContext(PlayerContext);
  return <button className="secondary" onClick={()=>play(track,queue)} aria-label={`Play ${track.title}`}>Play</button>;
}
