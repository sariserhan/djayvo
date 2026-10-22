'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {searchTasteReferences} from '../../lib/taste-catalogue';

export function FavoriteSearch({saved,disabled,onSelect}:{saved:string[];disabled:boolean;onSelect:(reference:string)=>void}){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0);
 const matches=searchTasteReferences(query,saved),typed=query.trim();
 const options=[...matches,...(typed&&!matches.some(m=>m.reference.toLowerCase()===typed.toLowerCase())?[{reference:typed,kind:'Add by name',detail:'Not a catalogue match'}]:[])];
 const expanded=open&&!disabled,selected=Math.min(active,options.length-1);
 useEffect(()=>{if(expanded&&selected>=0)document.getElementById(`${id}-option-${selected}`)?.scrollIntoView({block:'nearest'});},[expanded,selected,id,query]);
 function choose(reference:string){input.current?.focus();onSelect(reference);setQuery('');setOpen(false);setActive(0);}
 return <div className="dna-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <label htmlFor={id}>Search artists or tracks</label>
  <input id={id} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded?`${id}-results`:undefined}
   aria-activedescendant={expanded&&selected>=0?`${id}-option-${selected}`:undefined} aria-describedby={`${id}-help`}
   autoComplete="off" maxLength={160} disabled={disabled} placeholder="Start typing a song or artist…" value={query}
   onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setActive(0);setOpen(true);}}
   onKeyDown={event=>{
    if(event.nativeEvent.isComposing)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
     event.preventDefault();setOpen(true);
     if(options.length)setActive(!expanded?0:(selected+(event.key==='ArrowDown'?1:-1)+options.length)%options.length);
    }else if(event.key==='Escape'){event.preventDefault();setOpen(false);}
    else if(event.key==='Enter'&&expanded&&selected>=0){event.preventDefault();choose(options[selected].reference);}
   }}/>
  {expanded&&<div id={`${id}-results`} role="listbox" aria-label="Matching artists and tracks" className="dna-suggestions">
   {options.map((option,index)=><button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} key={option.reference}
    aria-selected={index===selected} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option.reference)}>
    <span className="dna-result-kind">{option.kind}</span><strong>{option.reference}</strong><span>{option.detail}{saved.includes(option.reference)?' · Already added':''}</span>
   </button>)}
  </div>}
  <p id={`${id}-help`}>Search the practice catalogue and your saved favorites. For a name we don’t have, choose “Add by name”.</p>
  <span className="dna-search-status" aria-live="polite">{expanded?`${matches.length} matching suggestions${typed&&options.length>matches.length?'; or add your own name':''}.`:''}</span>
 </div>;
}
