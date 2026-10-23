'use client';
import {useRef,useState} from 'react';
import {homeProducts} from '../lib/home-products';
export function ProductShowcase(){
 const [selected,setSelected]=useState<string>('music-dna');
 const audio=useRef<HTMLAudioElement>(null),[playing,setPlaying]=useState(false),[error,setError]=useState('');
 async function toggle(){if(!audio.current)return;if(!audio.current.paused){audio.current.pause();return;}try{setError('');await audio.current.play();}catch{setError('This example is unavailable here. Open Music DNA to see available songs.');}}
 const product=homeProducts.find(p=>p.slug===selected)!;
 return <section className="product-showcase" aria-label="Choose what to make">
  <div className="showcase-heading"><p className="eyebrow">Your music starts here.</p><h1>Make a song.<br/>Make a mix.<br/><em>Make it yours.</em></h1><p>Pick something. Try it.</p><a className="secondary" href="#public-songs">Listen to all songs ↓</a>
   <div className="showcase-choices" aria-label="Explore Jamloom products">{homeProducts.map(p=><button key={p.slug} type="button" aria-pressed={selected===p.slug} aria-controls="showcase-preview" onClick={()=>{document.querySelectorAll<HTMLAudioElement>('.showcase-preview audio').forEach(a=>a.pause());setPlaying(false);setError('');setSelected(p.slug);}}><span aria-hidden="true">{p.symbol}</span><span>{p.intent}<small>{p.name}</small></span></button>)}</div>
  </div>
  <div id="showcase-preview" className="showcase-preview" aria-label={`${product.name} preview`}>
   <div className="showcase-caption"><strong>{product.name}</strong><span>{product.badge}</span></div>
   {selected==='music-dna'?<div className="dna-demo"><p className="eyebrow">Your favorites</p><div className="demo-favorites"><span>Soundgarden</span><span>AC/DC</span><span>Metallica</span></div><div className="demo-arrow" aria-hidden="true">↓</div><div className="demo-song"><div className="demo-record" aria-hidden="true"><span>J</span></div><div><small>Your new original song</small><h2>Concrete Roots</h2><p>AI vocals · Heavy rock</p></div></div><button className="demo-play" onClick={toggle}>{playing?'Pause example':'▶ Hear this song'}</button><audio ref={audio} controls preload="none" aria-label="Hear Music DNA example Concrete Roots" src="/api/taste/song?id=06d89abd7d194ddf81bbc54af3e9b67f&file=audio" onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setError('This example is unavailable here. Open Music DNA to see available songs.')} onPlay={event=>{setPlaying(true);document.querySelectorAll('audio').forEach(a=>{if(a!==event.currentTarget)a.pause();});}}/><p className="demo-note">A real example made from these favorites.</p>{error&&<p role="status">{error}</p>}</div>:<a className="showcase-image" href={'#'+product.slug}><img src={'/product-previews/'+product.slug+'.png'} width={product.previewWidth} height={product.previewHeight} alt={product.name+' actual workspace preview'}/></a>}
   <div className="showcase-footer"><p>{product.description}</p><a className="primary" href={selected==='dj-studio'?'#dj-studio':'/'+product.slug}>{selected==='dj-studio'?'Try these decks':product.action} <span aria-hidden="true">↗</span></a></div>
  </div>
 </section>;
}
