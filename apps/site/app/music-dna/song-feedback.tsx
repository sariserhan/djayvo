'use client';
import {useEffect,useState} from 'react';
import {likedTags,issueTags,type DnaFeedback} from '../../lib/dna-feedback-schema';
export function listenerHeaders(create=false):Record<string,string>{
 try{let id=localStorage.getItem('jamloom-dna-listener-v1');if((!id||!/^[a-f0-9]{32}$/.test(id))&&create){id=crypto.randomUUID().replaceAll('-','');localStorage.setItem('jamloom-dna-listener-v1',id);}return id&&/^[a-f0-9]{32}$/.test(id)?{'X-Jamloom-Listener':id}:{};}catch{return {};}
}
export function SongFeedback({id}:{id:string}){
 const [value,setValue]=useState<DnaFeedback|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[revision,setRevision]=useState(0);
 const endpoint=`/api/taste/feedback?id=${id}`;
 useEffect(()=>{const reload=()=>setRevision(r=>r+1);window.addEventListener('jamloom-feedback-cleared',reload);return()=>window.removeEventListener('jamloom-feedback-cleared',reload);},[]);
 useEffect(()=>{const controller=new AbortController(),headers=listenerHeaders();setLoading(true);setLoadError(false);
 if(!headers['X-Jamloom-Listener']){setLoading(false);return;}
 void fetch(endpoint,{headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(controller.signal.aborted)return;setValue(data.feedback??null);setSaved(Boolean(data.feedback));setMessage('');}).catch(()=>{if(!controller.signal.aborted){setLoadError(true);setMessage('Saved feedback could not load. Retry before changing it.');}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[endpoint,revision]);
 async function submit(remove=false){
  const headers=listenerHeaders(true);if(!headers['X-Jamloom-Listener']){setMessage('Enable browser storage to save feedback.');return;}
  setBusy(true);try{const r=await fetch(endpoint,{method:remove?'DELETE':'POST',headers:{...headers,'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:remove?undefined:JSON.stringify(value),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error);
   if(remove){setValue(null);setSaved(false);setMessage('Feedback deleted. It will not guide new songs or future training.');}else{setSaved(true);setMessage(value?.trainingConsent?'Feedback saved. Consented songs can enter model training when enough reviewed examples are available.':value?.personalize?'Feedback saved. We’ll use it for your next songs in this style.':'Feedback saved. Personalization and model training are off.');}
  }catch(error){setMessage(error instanceof Error?error.message:'Feedback could not be saved.');}finally{setBusy(false);}
 }
 return <div className="dna-feedback"><fieldset disabled={busy||loading||loadError} aria-label="Song feedback"><legend>Would you listen again?</legend><div className="product-actions">{(['like','dislike']as const).map(rating=><button key={rating} className="secondary" aria-pressed={value?.rating===rating} onClick={()=>setValue(old=>({rating,tags:old?.rating===rating?old.tags:[],personalize:old?.personalize??false,trainingConsent:old?.trainingConsent??false}))}>{rating==='like'?'Yes, I like it':'Not for me'}</button>)}</div>
 {value&&<><p>{value.rating==='like'?'What worked? (optional, up to 6)':'What missed? (optional, up to 6)'}</p><div className="product-actions">{Object.entries(value.rating==='like'?likedTags:issueTags).map(([key,label])=><button className="secondary" aria-pressed={value.tags.includes(key)} key={key} onClick={()=>setValue({...value,tags:value.tags.includes(key)?value.tags.filter(t=>t!==key):value.tags.length<6?[...value.tags,key]:value.tags})}>{label}</button>)}</div>
 <label><input type="checkbox" checked={value.personalize} onChange={e=>setValue({...value,personalize:e.target.checked})}/> Use this feedback to shape my future songs</label>
 <label><input type="checkbox" checked={value.trainingConsent} onChange={e=>setValue({...value,trainingConsent:e.target.checked})}/> Allow this Jamloom song and my rating to help train the model</label>
 <p>Only your Jamloom-generated song and rating are included. Your favorite recordings stay out of training. You can change or delete this permission here to stop future use.</p>
 <div className="product-actions"><button className="secondary" onClick={()=>submit()}>Save feedback</button>{saved&&<button className="secondary" onClick={()=>submit(true)}>Delete feedback</button>}</div></>}
 <p role="status">{loading?'Loading feedback…':message}</p></fieldset>{loadError&&<button className="secondary" onClick={()=>setRevision(r=>r+1)}>Reload feedback</button>}</div>;
}
export function FeedbackSettings(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function clear(){
  const headers=listenerHeaders();if(!headers['X-Jamloom-Listener']){setMessage('No feedback is saved for this browser.');return;}
  setBusy(true);try{const r=await fetch('/api/taste/feedback',{method:'DELETE',headers:{...headers,'X-Jamloom-DNA':'1'},signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error);
   window.dispatchEvent(new Event('jamloom-feedback-cleared'));setMessage('All feedback from this browser and its training permissions have been deleted.');
  }catch(error){setMessage(error instanceof Error?error.message:'Could not delete feedback. Please try again.');}finally{setBusy(false);}
 }
 return <details><summary>Feedback settings</summary><p>Delete your ratings and permissions to use them, including feedback on older songs. Your songs and favorites stay available.</p><button className="secondary" disabled={busy} onClick={clear}>Delete all my feedback</button><p role="status">{message}</p></details>;
}
