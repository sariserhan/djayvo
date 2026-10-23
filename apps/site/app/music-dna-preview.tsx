'use client';
import {useRef,useState} from 'react';
import languages from '../../../assets/manifests/dna-languages.json';
type Song={id:string;title:string;language:string;direction:string};
export function MusicDnaPreview({songs}:{songs:Song[]}){
 const [start,setStart]=useState(0),[playing,setPlaying]=useState<string|null>(null),[error,setError]=useState('');
 const audio=useRef<Record<string,HTMLAudioElement|null>>({});
 const displayed=Array.from({length:Math.min(4,songs.length)},(_,i)=>songs[(start+i)%songs.length]);
 async function toggle(id:string){
  const player=audio.current[id];if(!player)return;
  if(!player.paused){player.pause();return;}
  setError('');try{await player.play();}catch{if(audio.current[id]===player)setError('This song could not play. Try another song.');}
 }
 function changePage(step:number){Object.values(audio.current).forEach(player=>player?.pause());setPlaying(null);setError('');setStart((start+step*4+songs.length)%songs.length);}
 return <section className="dna-listen-preview" aria-label="Made with Music DNA">
  <h3>Made with Music DNA</h3>
  <div className="dna-preview-grid">{displayed.map(song=><div className="dna-preview-song" key={song.id}>
   <span className="dna-preview-record" aria-hidden="true">♫</span>
   <h4>{song.title}</h4>
   <p>{(languages.languages as Record<string,string>)[song.language]??song.language} · {song.direction}</p>
   <button className="secondary" aria-label={`${playing===song.id?'Pause':'Play'} ${song.title}`} onClick={()=>toggle(song.id)}><span aria-hidden="true">{playing===song.id?'Ⅱ':'▶'}</span> {playing===song.id?'Pause':'Play'}</button>
   <audio ref={element=>{audio.current[song.id]=element;}} preload="none" src={`/api/taste/song?id=${song.id}&file=audio`} onPlay={event=>{setPlaying(song.id);document.querySelectorAll('audio').forEach(player=>{if(player!==event.currentTarget)player.pause();});}} onPause={()=>setPlaying(current=>current===song.id?null:current)} onEnded={()=>setPlaying(current=>current===song.id?null:current)}/>
  </div>)}</div>
  <div className="dna-preview-footer"><a href="/music-dna#public-songs">Listen to all songs ↗</a>{songs.length>4&&<div className="dna-preview-paging"><button className="secondary" onClick={()=>changePage(-1)} aria-label="Back to previous songs">← Back</button><button className="secondary" onClick={()=>changePage(1)} aria-label="Next songs">Next →</button></div>}</div>
  <p role="status" className="dna-preview-status">{error}</p>
 </section>;
}
