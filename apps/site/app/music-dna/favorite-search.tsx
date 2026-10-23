'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {searchTasteReferences,type TasteSuggestion,type ReferenceMetadata} from '../../lib/taste-catalogue';

export function FavoriteSearch({saved,disabled,onSelect}:{saved:string[];disabled:boolean;onSelect:(reference:string,metadata?:ReferenceMetadata)=>void}){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState<string|null>(null);
 const [remote,setRemote]=useState<{query:string;suggestions:TasteSuggestion[];error:string}>({query:'',suggestions:[],error:''});
 const cache=useRef(new Map<string,{expires:number;suggestions:TasteSuggestion[]}>());
 const typed=query.trim(),expanded=open&&!disabled,online=expanded&&typed.length>=2;
 const candidates=[...searchTasteReferences(query,saved),...(remote.query===typed?remote.suggestions:[])];
 const matches=candidates.filter((candidate,index)=>candidates.findIndex(c=>c.reference.normalize('NFKC').toLowerCase()===candidate.reference.normalize('NFKC').toLowerCase())===index).slice(0,16);
 const options=[...matches,...(typed&&!matches.some(m=>m.reference.toLowerCase()===typed.toLowerCase())?[{reference:typed,kind:'Add by name',detail:'Not a catalogue match'}]:[])];
 const selected=Math.max(0,options.findIndex(option=>option.reference===active)),loading=online&&remote.query!==typed;
 useEffect(()=>{
  if(!online)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   try{
    const cached=cache.current.get(typed);
    if(cached&&cached.expires>Date.now()){setRemote({query:typed,suggestions:cached.suggestions,error:''});return;}
    const response=await fetch('/api/music-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:typed}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
    const data=await response.json();
    if(!response.ok)throw Error(response.status===429?'Music search is busy. Try again in a minute, or add a name yourself.':'Online music search is unavailable. You can still add a name yourself.');
    if(!Array.isArray(data.suggestions))throw Error('Online music search is unavailable. You can still add a name yourself.');
    if(controller.signal.aborted)return;
    if(cache.current.size>=100)cache.current.delete(cache.current.keys().next().value!);
    cache.current.set(typed,{expires:Date.now()+300_000,suggestions:data.suggestions});
    setRemote({query:typed,suggestions:data.suggestions,error:''});
   }catch(error){if(!controller.signal.aborted)setRemote({query:typed,suggestions:[],error:error instanceof Error&&error.message.startsWith('Music search is busy')?error.message:'Online music search is unavailable. You can still add a name yourself.'});}
  },400);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[typed,online]);
 useEffect(()=>{if(expanded&&selected>=0)document.getElementById(`${id}-option-${selected}`)?.scrollIntoView({block:'nearest'});},[expanded,selected,id,query,options.length]);
 function choose(reference:string){input.current?.focus();onSelect(reference,matches.find(m=>m.reference===reference)?.metadata);setQuery('');setOpen(false);setActive(null);}
 return <div className="dna-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <label htmlFor={id}>Search artists or tracks</label>
  <input id={id} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded?`${id}-results`:undefined}
   aria-activedescendant={expanded&&selected>=0?`${id}-option-${selected}`:undefined} aria-describedby={`${id}-help`}
   autoComplete="off" maxLength={160} disabled={disabled} placeholder="Start typing a song or artist…" value={query}
   onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setActive(null);setOpen(true);}}
   onKeyDown={event=>{
    if(event.nativeEvent.isComposing)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
     event.preventDefault();setOpen(true);
     if(options.length)setActive(options[!expanded?0:(selected+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].reference);
    }else if(event.key==='Escape'){event.preventDefault();setOpen(false);}
    else if(event.key==='Enter'&&expanded&&selected>=0){event.preventDefault();choose(options[selected].reference);}
   }}/>
  {expanded&&<div id={`${id}-results`} role="listbox" aria-label="Matching artists and tracks" className="dna-suggestions">
   {options.map((option,index)=><button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} key={option.reference}
    aria-selected={index===selected} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option.reference)}>
    <span className="dna-result-kind">{option.kind}</span><strong>{option.reference}</strong><span>{option.detail}{saved.includes(option.reference)?' · Already added':''}</span>
   </button>)}
  </div>}
  <p id={`${id}-help`}>Search via Apple iTunes. Names only; no songs imported.</p>
  {online&&<p role="status">{loading?'Searching iTunes…':remote.error||(remote.suggestions.length?'Results from iTunes and your local favorites.':'No online matches. Try another spelling or choose “Add by name”.')}</p>}
  <span className="dna-search-status" aria-live="polite">{expanded?`${matches.length} matching suggestions${typed&&options.length>matches.length?'; or add your own name':''}.`:''}</span>
 </div>;
}
