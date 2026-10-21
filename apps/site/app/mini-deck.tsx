'use client';
import {useEffect,useRef,useState} from 'react';
import {createMixer,updateMixer} from '../../web/mixer.js';

type Track={title:string;artist:string;url:string;source_page:string};
export function MiniDeck({tracks}:{tracks:Track[]}) {
 const audio=useRef<(HTMLAudioElement|null)[]>([]),canvas=useRef<HTMLCanvasElement>(null);
 const graph=useRef<{context:AudioContext;mixer:ReturnType<typeof createMixer>}|null>(null);
 const [playing,setPlaying]=useState([false,false]),[busy,setBusy]=useState([false,false]),[error,setError]=useState('');
 const [cross,setCross]=useState(0),[master,setMaster]=useState(.7);
 const levels=useRef({cross:0,master:.7}),alive=useRef(true);
 useEffect(()=>{
  alive.current=true;const media=audio.current;
  const pauseOthers=(event:Event)=>{if(!media.includes(event.target as HTMLAudioElement))media.forEach(a=>a?.pause());};
  const pause=()=>media.forEach(a=>a?.pause());
  document.addEventListener('play',pauseOthers,true);window.addEventListener('pagehide',pause);
  let frame=0;const samples=new Uint8Array(256);
  function draw(){const element=canvas.current,ctx=element?.getContext('2d');if(ctx&&element){
   const {width,height}=element;ctx.clearRect(0,0,width,height);ctx.strokeStyle='#c9fa78';ctx.lineWidth=2;ctx.beginPath();
   if(graph.current)graph.current.mixer.meter.getByteTimeDomainData(samples);else samples.fill(128);
   samples.forEach((v,i)=>{const x=i/(samples.length-1)*width,y=v/256*height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  }frame=requestAnimationFrame(draw);}draw();
  return()=>{alive.current=false;cancelAnimationFrame(frame);pause();document.removeEventListener('play',pauseOthers,true);window.removeEventListener('pagehide',pause);void graph.current?.context.close();graph.current=null;};
 },[]);
 function mix(value:number,field:'cross'|'master') {
  levels.current={...levels.current,[field]:value};field==='cross'?setCross(value):setMaster(value);
  if(graph.current)updateMixer(graph.current.context,graph.current.mixer,levels.current.cross,[1,1],levels.current.master);
 }
 async function play(i:number){
  if(busy[i])return;
  const media=audio.current[i];if(!media)return;if(!media.paused){media.pause();return;}
  setError('');setBusy(v=>v.map((x,n)=>n===i?true:x));
  try{
   if(!graph.current){const context=new AudioContext(),mixer=createMixer(context);graph.current={context,mixer};audio.current.forEach((a,n)=>{if(a)context.createMediaElementSource(a).connect(mixer.strips[n].input);});updateMixer(context,mixer,levels.current.cross,[1,1],levels.current.master);}
   await graph.current.context.resume();if(!alive.current)return;await media.play();if(!alive.current)media.pause();
  }catch{if(alive.current)setError('Playback could not start. Try again or open the full studio.');}
  finally{if(alive.current)setBusy(v=>v.map((x,n)=>n===i?false:x));}
 }
 return <section className="mini-deck" aria-label="Try the DJ decks">
  <div className="deck-topline"><span>JAMLOOM <b>DJ / MINI</b></span><span className="deck-indicator">{playing.some(Boolean)?'PLAYING':'READY TO PLAY'}</span></div>
  <canvas ref={canvas} width={720} height={76} className="deck-scope" aria-label="Live mixed audio waveform" role="img"/>
  <div className="mini-decks">{tracks.map((track,i)=><div className={`mini-channel channel-${i}`} key={track.url}>
   <div className="deck-readout"><span>DECK {i?'B':'A'}</span><strong>{track.title}</strong><small>{track.artist}</small></div>
   <button type="button" className="mini-platter" data-playing={playing[i]} aria-pressed={playing[i]} aria-label={`${playing[i]?'Pause':'Play'} Deck ${i?'B':'A'} from platter`} disabled={busy[i]} onClick={()=>void play(i)}><span className="platter-label" aria-hidden="true"><span>{i?'B':'A'}</span><i/></span></button>
   <audio ref={element=>{audio.current[i]=element;}} src={track.url} preload="none" onPlay={()=>{document.querySelector<HTMLAudioElement>('.music-player audio')?.pause();setPlaying(v=>v.map((x,n)=>n===i?true:x));}} onPause={()=>setPlaying(v=>v.map((x,n)=>n===i?false:x))} onEnded={()=>setPlaying(v=>v.map((x,n)=>n===i?false:x))} onError={()=>setError('Practice audio could not load. Check your connection and try again.')}/>
   <div className="deck-buttons"><button type="button" aria-label={`Cue Deck ${i?'B':'A'}`} onClick={()=>{const a=audio.current[i];if(a){a.pause();a.currentTime=0;}}}>CUE</button><button type="button" className="deck-play" aria-pressed={playing[i]} aria-label={`${playing[i]?'Pause':'Play'} Deck ${i?'B':'A'}`} disabled={busy[i]} onClick={()=>void play(i)}>{busy[i]?'…':playing[i]?'Ⅱ':'▶'}</button></div>
  </div>)}</div>
  <div className="mini-mixer"><label><span>A <b>Crossfader</b> B</span><input aria-label="Mini deck crossfader" type="range" min="0" max="1" step="0.01" value={cross} onChange={e=>mix(Number(e.target.value),'cross')}/></label><label><span>Master <output>{Math.round(master*100)}%</output></span><input aria-label="Mini deck master volume" type="range" min="0" max="1" step="0.01" value={master} onChange={e=>mix(Number(e.target.value),'master')}/></label></div>
  <p className="deck-tip">Press play on both decks. Slide between them.</p><p role="alert" hidden={!error}>{error}</p>
  <div className="deck-credits">Practice tracks · CC0 · {tracks.map((t,i)=><span key={t.url}>{i?' / ':''}<a href={t.source_page} target="_blank" rel="noreferrer">{t.artist}</a></span>)}</div>
 </section>;
}
