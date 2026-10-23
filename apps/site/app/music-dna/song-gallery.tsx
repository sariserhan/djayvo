'use client';
import {useEffect,useRef,useState} from 'react';
import {SongFeedback} from './song-feedback';
import languages from '../../../../assets/manifests/dna-languages.json';
type Entry={id:string;title:string;language:string;direction?:string;historical?:boolean;visibility?:string;withdrawn_at?:string;check?:'passed'|'style-mismatch'|'not-checked';product?:string};
export function SongGallery({scope,title,product='music-dna'}:{scope:'examples'|'mine'|'public'|'validation'|'showcase';title:string;product?:'music-dna'|'improvise'}){
 const curated=scope==='validation'||scope==='showcase';
 const paginated=curated||scope==='examples';
 const [page,setPage]=useState(1),[columns,setColumns]=useState(1);
 const grid=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!paginated||!grid.current)return;
  let previousColumns=0;
  const measure=()=>{
   const count=getComputedStyle(grid.current!).gridTemplateColumns.split(' ').length;
   if(previousColumns!==count){previousColumns=count;setColumns(count);setPage(1);}
  };
  const observer=new ResizeObserver(measure);observer.observe(grid.current);measure();
  return()=>observer.disconnect();
 },[paginated]);
 const endpoint=product==='improvise'?'/api/improvise/song':'/api/taste/song';
 const [songs,setSongs]=useState<Entry[]>([]),[next,setNext]=useState<string|null>(null),[message,setMessage]=useState('Loading songs…'),[busy,setBusy]=useState(false);
 const [feedbackAvailable,setFeedbackAvailable]=useState(true),[accountFeedback,setAccountFeedback]=useState(false);
 const [language,setLanguage]=useState(''),[genre,setGenre]=useState('');
 const [options,setOptions]=useState<{languages:string[];genres:string[]}>({languages:[],genres:[]});
 const requestId=useRef(0),filterable=scope!=='mine';
 const publicLanguage=scope==='public'?language:'',publicGenre=scope==='public'?genre:'';
 async function load(after=''){
  const current=++requestId.current;setBusy(true);
  try{
   const query=new URLSearchParams({view:scope==='showcase'?'validation':scope,after,language:publicLanguage,genre:publicGenre});
   const response=await fetch(`${endpoint}?${query}`,{signal:AbortSignal.timeout(10000)}),result=await response.json();
   if(current!==requestId.current)return;
   if(!response.ok)throw Error(result.error??'Songs could not load.');
   if(!Array.isArray(result.songs))throw Error('Invalid song collection');
   if(result.filters)setOptions(result.filters);
   setSongs(old=>after?[...old,...result.songs]:result.songs);setNext(result.next);setFeedbackAvailable(result.feedbackAvailable!==false);setAccountFeedback(result.accountFeedback===true);
   setMessage(result.signIn?'Sign in to see all your songs.':result.available===false?'Song collections are not enabled on this server yet.':result.songs.length?'':(publicLanguage||publicGenre)?'No songs match these filters.':scope==='public'?'Public songs will appear here after successful generation.':'No songs yet. Make your first song above.');
  }catch{if(current===requestId.current)setMessage('Songs could not load. Please try again.');}finally{if(current===requestId.current)setBusy(false);}
 }
 useEffect(()=>{void load();const refresh=()=>{if(!document.hidden)void load();};
  window.addEventListener('jamloom-dna-completed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=scope==='public'||curated?setInterval(refresh,60000):undefined;
  return()=>{requestId.current++;clearInterval(timer);window.removeEventListener('jamloom-dna-completed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[scope,product,publicLanguage,publicGenre]);
 async function withdraw(id:string){
  setBusy(true);try{const response=await fetch(endpoint+'?id='+id,{method:'DELETE',headers:{'X-Jamloom-DNA':'1'}});if(!response.ok)throw Error();await load();window.dispatchEvent(new Event('jamloom-dna-completed'));}catch{setMessage('Could not remove this song from the public page. Try again.');}finally{setBusy(false);}
 }
 const filtered=songs.filter(song=>(!language||song.language===language)&&(!genre||song.direction===genre));
 const ordered=scope==='showcase'?[...filtered].reverse():filtered;
 const pageSize=columns*6,pageCount=Math.max(1,Math.ceil(ordered.length/pageSize));
 const currentPage=Math.min(page,pageCount);
 const displayed=paginated?ordered.slice((currentPage-1)*pageSize,currentPage*pageSize):ordered;
 function changePage(value:number){
  setPage(value);grid.current?.closest('section')?.scrollIntoView({block:'start'});
 }
 const pagination=(position:string)=>paginated&&pageCount>1&&<nav className="song-pagination" aria-label={`${title} pages ${position}`}>
  <button className="secondary" disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}>Previous</button>
  <span role="status">Page {currentPage} of {pageCount}</span>
  <button className="secondary" disabled={currentPage===pageCount} onClick={()=>changePage(currentPage+1)}>Next</button>
 </nav>;
 return <section id={scope==='showcase'?'public-songs':undefined} className="product-panel" aria-label={title}><h2>{title}</h2>
  <p>{scope==='showcase'?'Every song from our listening collection. Choose a language or genre, then press play.':scope==='validation'?'Listen to our test songs. Automated checks do not judge pronunciation or musical quality.':scope==='examples'?'Press play. Original AI songs inspired by example favorites.':scope==='mine'?'All your songs. Private stays private.':'Made by listeners. Shared with everyone.'}</p>
  {filterable&&<div className="product-actions song-filters">
   <label>Language <select aria-label="Language" value={language} onChange={e=>{setLanguage(e.target.value);setPage(1);}}><option value="">All languages</option>{(scope==='public'?[...options.languages]:[...new Set(songs.map(s=>s.language))]).sort((a,b)=>((languages.languages as Record<string,string>)[a]??a).localeCompare((languages.languages as Record<string,string>)[b]??b)).map(code=><option key={code} value={code}>{(languages.languages as Record<string,string>)[code]??code}</option>)}</select></label>
   <label>Genre <select aria-label="Genre" value={genre} onChange={e=>{setGenre(e.target.value);setPage(1);}}><option value="">All genres</option>{(scope==='public'?[...options.genres]:[...new Set(songs.flatMap(s=>s.direction?[s.direction]:[]))]).sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label>
   {(language||genre)&&<button className="secondary" onClick={()=>{setLanguage('');setGenre('');setPage(1);}}>Clear filters</button>}
  </div>}
  {scope==='public'&&busy&&<p role="status">Loading songs…</p>}

  {filterable&&scope!=='public'&&<p role="status">{filtered.length?`${filtered.length} songs`:songs.length?'No songs match these filters.':''}</p>}
  {pagination('top')}
  <div ref={grid} className={`dna-song-grid${paginated?' song-paged-grid':''}`} aria-busy={busy} hidden={scope==='public'&&busy}>{displayed.map(song=><article key={song.id}><h3>{song.title}</h3><p>{(languages.languages as Record<string,string>)[song.language]??song.language}{song.direction?' · '+song.direction:''}{scope==='mine'?' · '+(song.withdrawn_at?'Removed from public page':song.visibility):''}</p>
   {scope==='validation'&&song.check&&<p>Sample {song.id.slice(0,6)} · {song.product==='improvise'?'Improvise':'Music DNA'} · {song.check==='passed'?'Passed automated style check':song.check==='style-mismatch'?'Flagged by automated style check':'Test take · style not verified'}. Automated checks can be wrong; they do not judge lyrics or singing.</p>}
   {song.historical&&<p>Earlier experiment · style match not checked.</p>}
   <audio controls preload="none" aria-label={`Listen to ${song.title}`} src={`${endpoint}?id=${song.id}&file=audio`} onPlay={event=>document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();})}/>
   <div className="product-actions"><a className="secondary" href={`${endpoint}?id=${song.id}&file=audio&download=1`} download>Download song</a>
   {scope==='mine'&&song.visibility==='public'&&!song.withdrawn_at&&<button className="secondary" disabled={busy} onClick={()=>withdraw(song.id)}>Remove from public page</button>}</div>
   {feedbackAvailable&&scope!=='public'&&!curated&&!song.historical&&<details><summary>Rate this song</summary><SongFeedback id={song.id} account={accountFeedback}/></details>}
  </article>)}</div>
  {pagination('bottom')}
  <p role="status">{message}</p>{next&&<button className="secondary" disabled={busy} onClick={()=>load(next)}>Load more songs</button>}
  {message.includes('try again')&&<button className="secondary" disabled={busy} onClick={()=>load()}>Retry songs</button>}
  {scope==='mine'&&message.includes('Sign in')&&<a href="/account/sign-in?callbackURL=%2Fmusic-dna">Sign in</a>}
 </section>;
}
