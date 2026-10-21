'use client';
import {useEffect,useState} from 'react';
import {emptyTaste,validateTaste,tasteBrief,energies,instruments,type Taste} from '../../lib/taste';
export function TasteNotebook(){
 const [profile,setProfile]=useState<Taste>(emptyTaste),[message,setMessage]=useState(''),[brief,setBrief]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{try{const old=localStorage.getItem('jamloom-taste-v1');if(old)setProfile(validateTaste(JSON.parse(old)));}catch{setMessage('Saved preferences could not be read. Start a new profile or clear this device’s saved profile.');}},[]);
 const prepared=()=>validateTaste({...profile,references:profile.references.filter(s=>s.trim())});
 function save(){try{const p=prepared();localStorage.setItem('jamloom-taste-v1',JSON.stringify(p));setBrief(JSON.stringify(tasteBrief(p),null,2));setMessage('Saved on this device. Three creative directions prepared; no audio generated.');}catch{setMessage('Use at most 20 non-empty references, 160 characters each, and select at least one instrument. Device storage must be available.');}}
 async function sync(method:'GET'|'POST'|'DELETE'){
  setBusy(true);try{const response=await fetch('/api/taste',{method,headers:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(method==='POST'?{profile:prepared(),revision}:{revision})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(method==='GET'){if(!data.saved){setRevision(0);setMessage('No account profile saved. Your local draft is unchanged.');}else{setProfile(validateTaste(data.saved.profile));setRevision(data.saved.revision);setBrief('');setMessage('Loaded your account profile into this draft. Local saved preferences are unchanged until you save them.');}}
   else if(method==='POST'){setRevision(data.revision);setMessage('Preferences saved privately to your account. No training permission granted.');}
   else{setRevision(0);setMessage('Account profile deleted. Your local draft and saved local profile are unchanged.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Account preferences unavailable.');}finally{setBusy(false);}
 }
 function clear(){try{localStorage.removeItem('jamloom-taste-v1');setProfile(emptyTaste);setBrief('');setMessage('Saved profile deleted from this device.');}catch{setMessage('Storage is unavailable. Clear site data in your browser settings.');}}
 return <section className="product-panel"><h2>Your preference notebook</h2><p>Tell us what matters to you. Song names are personal notes; we do not fetch, listen to or train on those recordings.</p><div className="product-controls">
 <label>Favourite tracks and artists — one per line<textarea disabled={busy} value={profile.references.join('\n')} maxLength={3220} onChange={e=>setProfile({...profile,references:e.target.value.split('\n')})}/></label>
 <label>Energy<select disabled={busy} value={profile.energy} onChange={e=>setProfile({...profile,energy:e.target.value as Taste['energy']})}>{energies.map(e=><option key={e}>{e}</option>)}</select></label>
 <label>Preferred tempo: {profile.tempo} BPM<input disabled={busy} type="range" min="60" max="180" value={profile.tempo} onChange={e=>setProfile({...profile,tempo:Number(e.target.value)})}/></label>
 <fieldset><legend>Instruments you enjoy</legend>{instruments.map(i=><label key={i}><input disabled={busy} type="checkbox" checked={profile.instruments.includes(i)} onChange={e=>setProfile({...profile,instruments:e.target.checked?[...profile.instruments,i]:profile.instruments.filter(v=>v!==i)})}/>{i}</label>)}</fieldset>
 <label>Room for surprise: {profile.novelty}%<input disabled={busy} type="range" min="0" max="100" value={profile.novelty} onChange={e=>setProfile({...profile,novelty:Number(e.target.value)})}/></label>
 <button className="primary" disabled={busy} onClick={save}>Save preferences and prepare directions</button><button className="secondary" disabled={busy} onClick={clear}>Delete saved profile</button><p role="status">{message}</p>
 {brief&&<><h3>Three possible musical directions</h3><p>Rhythmic conversation · melodic development · bass and silence. These are planning alternatives, not finished songs. Your selected tempo, instruments and energy guide each proposal.</p><details><summary>View or copy the creative brief</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{brief}</pre></details></>}
 <fieldset><legend>Optional account copy</legend><p>These actions send only your written references and preferences to your private account. <a href="/account/sign-in">Sign in</a> first. Load an existing account profile before updating it.</p><div className="product-actions"><button className="secondary" disabled={busy} onClick={()=>sync('GET')}>Load account profile</button><button className="secondary" disabled={busy} onClick={()=>sync('POST')}>Save preferences to account</button><button className="secondary" disabled={busy||revision===0} onClick={()=>sync('DELETE')}>Delete account profile</button></div></fieldset>
 <button disabled>Generate original audio — not released</button><p>No credits charged. Taste-driven audio generation and iPhone account sync remain in development.</p></div></section>;
}
