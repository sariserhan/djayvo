'use client';
import {useEffect,useState} from 'react';
type Quote={credits:number;privacyCredits:number;expiresAt:number;token:string};
export function GenerationRehearsal(){
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 const [source,setSource]=useState<File|null>(null),[plan,setPlan]=useState<File|null>(null),[consent,setConsent]=useState(false);
 const [input,setInput]=useState<{source:string;plan:string;title:string;consent:true}|null>(null),[quote,setQuote]=useState<Quote|null>(null);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[requestId,setRequestId]=useState('');
 const [jobs,setJobs]=useState<{id:string;state:string;output_id:string|null}[]>([]);
 async function call(body?:unknown){const response=await fetch('/api/generations',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error);return data;}
 async function act(action:()=>Promise<void>){setBusy(true);try{await action();}catch(error){setMessage(error instanceof Error?error.message:'Request failed.');}finally{setBusy(false);}}
 const pending=jobs.some(job=>['queued','running','stopping'].includes(job.state));
 useEffect(()=>{
  if(!pending)return;
  let active=true;const timer=setInterval(()=>{void call().then(data=>{if(active){setJobs(data.jobs);if(!data.jobs.some((job:{state:string})=>['queued','running','stopping'].includes(job.state)))setMessage('Work finished. Check each result below; completed audio is saved privately.');}}).catch(()=>{if(active)setMessage('Job updates are unavailable. Your reservation is unchanged; retry history.');});},3000);
  return ()=>{active=false;clearInterval(timer);};
 },[pending]);
 function changed(){setQuote(null);setInput(null);setRequestId('');}
 return <section className="product-panel product-controls" style={{overflowWrap:"anywhere"}}><h2>Local generation rehearsal</h2><p>This isolated development flow uses sandbox credits and local CPU rendering. It makes no purchase or GPU rental. Upload only a source and its exported Jamloom score that you have permission to process.</p>
 <label>Source WAV, 2–5 seconds<input type="file" accept=".wav" disabled={busy||!ready} onChange={e=>{changed();setSource(e.target.files?.[0]??null);}}/></label>
 <label>Matching Jamloom score<input type="file" accept=".json" disabled={busy||!ready} onChange={e=>{changed();setPlan(e.target.files?.[0]??null);}}/></label>
 <label><input type="checkbox" checked={consent} disabled={busy||!ready} onChange={e=>{changed();setConsent(e.target.checked);}}/>I have permission to upload and process this source and save the result privately.</label>
 <button className="secondary" disabled={busy||!source||!plan||!consent} onClick={()=>act(async()=>{
  if(!source||!plan||source.size>960044||plan.size>1000000)throw Error('Source or score is too large.');
  const bytes=new Uint8Array(await source.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const value={source:btoa(binary),plan:await plan.text(),title:'Private generation rehearsal',consent:true as const};
  const result=await call({action:'quote',input:value});setInput(value);setQuote(result);setRequestId(current=>current||crypto.randomUUID());setMessage('Quote ready; nothing reserved yet.');
 })}>Get exact credit quote</button>
 {quote&&<div><p>Reserve at most {quote.credits} sandbox credits, including {quote.privacyCredits} for private creation. Expires {new Date(quote.expiresAt).toLocaleTimeString()}. Unused credits return to their original purchase lots.</p><button className="secondary" disabled={busy||!consent} onClick={()=>act(async()=>{const result=await call({action:'submit',requestId,input,token:quote.token});setMessage('Queued '+result.id+'. Run the local worker to render it.');setJobs((await call()).jobs);})}>Accept quote and queue</button></div>}
 <button className="secondary" disabled={busy} onClick={()=>act(async()=>{setJobs((await call()).jobs);setMessage('History refreshed.');})}>Refresh job history</button>
 <p role="status">{message}</p><ul>{jobs.map(job=><li key={job.id}>{job.state} · {job.id} {job.output_id&&<a href={`/api/library/${job.output_id}/audio`}>Play saved result</a>}{['queued','running','stopping'].includes(job.state)&&<button className="secondary" disabled={busy} onClick={()=>act(async()=>{await call({action:'cancel',id:job.id});setJobs((await call()).jobs);setMessage('Cancellation requested. Credits release after worker shutdown.');})}>Cancel job</button>}</li>)}</ul></section>;
}
