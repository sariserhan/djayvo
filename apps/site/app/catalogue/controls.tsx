'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

async function send(path:string,body:object={},method='POST') {
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const value=await response.json();if(!response.ok)throw new Error(value.error||'Request failed. Try again.');return value;
}
export function CatalogueFilters({q='',strategy='',mood=''}:{q?:string;strategy?:string;mood?:string}) {
  const router=useRouter();
  return <form className="catalogue-filters" onSubmit={event=>{event.preventDefault();const values=new FormData(event.currentTarget);router.push('/catalogue?'+new URLSearchParams(Array.from(values.entries()).map(([k,v])=>[k,String(v)])).toString());}}>
    <label>Search<input name="q" defaultValue={q} maxLength={80} placeholder="Track or credited artist"/></label>
    <label>Direction<select name="strategy" aria-label="Direction" defaultValue={strategy}><option value="">All directions</option>{['hiphop','reggae','experimental','club','funk','call_response','hybrid'].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
    <label>Mood<select name="mood" aria-label="Mood" defaultValue={mood}><option value="">All moods</option>{['energetic','chill','playful','dark','uplifting'].map(s=><option key={s}>{s}</option>)}</select></label>
    <button className="primary">Find music</button>
  </form>;
}
export function SubmitTrack({id}:{id:string}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <details className="submission"><summary>Submit this mix for catalogue review</summary><form className="account-form" onSubmit={async event=>{
    event.preventDefault();const values=new FormData(event.currentTarget);setBusy(true);setMessage('');
    try{await send(`/api/catalogue/${id}/submit`,{artist:values.get('artist'),description:values.get('description'),mood:values.get('mood'),consent:values.get('consent')==='on'});setMessage('Submitted for review. It is not public until approved.');router.refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }}><p>Only your chosen credit, description and finished mix will be submitted. Editing a submission removes its previous approval.</p>
    <label>Public credit<input name="artist" maxLength={80} required disabled={busy}/></label>
    <label>Description<textarea name="description" maxLength={500} required disabled={busy}/></label>
    <label>Mood<select name="mood" aria-label="Submission mood" disabled={busy}>{['energetic','chill','playful','dark','uplifting'].map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="save-consent"><input type="checkbox" name="consent" required disabled={busy}/>I have permission to publish this complete mix for public listening, including recognizable voices. I understand listeners can save a copy. This grants no commercial reuse or training permission.</label>
    <button className="secondary" disabled={busy}>Submit for review</button><p role="status">{message}</p>
  </form></details>;
}
export function Withdraw({id}:{id:string}) {
  const router=useRouter(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await send(`/api/catalogue/${id}/withdraw`);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Withdraw from catalogue</button><p role="alert">{error}</p></>;
}
export function ReviewTrack({id,revision}:{id:string;revision:string}) {
  const router=useRouter(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="account-form" onSubmit={async event=>{
    event.preventDefault();const values=new FormData(event.currentTarget);setBusy(true);
    try{await send(`/api/catalogue/${id}/review`,{revision,note:values.get('note'),decision:values.get('decision'),confirmed:values.get('confirmed')==='on'});router.refresh();setMessage('Review saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }}><label>Review note<textarea name="note" maxLength={500} required disabled={busy}/></label>
    <label>Decision<select name="decision" aria-label="Decision" defaultValue="rejected" disabled={busy}><option value="rejected">Reject / remove</option><option value="approved">Approve public listening</option></select></label>
    <label className="save-consent"><input name="confirmed" type="checkbox" disabled={busy}/>I listened to this submission and checked its public-listening permissions. Required for approval.</label>
    <button className="secondary" disabled={busy}>Save review</button><p role="status">{message}</p></form>;
}
export function ReportTrack({id}:{id:string}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <details><summary>Report this track</summary><form className="account-form" onSubmit={async event=>{
    event.preventDefault();const values=new FormData(event.currentTarget);setBusy(true);
    try{await send(`/api/catalogue/${id}/report`,{reason:values.get('reason')});setMessage('Report received for review.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }}><p>Sign in to report a permission or content concern. Do not include sensitive personal information.</p><label>Reason<textarea name="reason" maxLength={500} required disabled={busy}/></label><button className="secondary" disabled={busy}>Send report</button><p role="status">{message}</p></form></details>;
}
export function PlaylistCreate() {
  const router=useRouter(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="account-form" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget,values=new FormData(form);setBusy(true);try{await send('/api/playlists',{title:values.get('title')});form.reset();router.refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
    <label>Playlist title<input name="title" required maxLength={80} disabled={busy}/></label><button className="secondary" disabled={busy}>Create private playlist</button><p role="status">{message}</p></form>;
}
export function PlaylistAdd({trackId,lists}:{trackId:string;lists:{id:string;title:string}[]}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  if(!lists.length)return <p>Create a private playlist in <Link href="/playlists">Playlists</Link> to save this track.</p>;
  return <form className="account-form" onSubmit={async event=>{event.preventDefault();const id=new FormData(event.currentTarget).get('playlist');setBusy(true);try{await send(`/api/playlists/${id}/${trackId}`);setMessage('Added to your private playlist.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
    <label>Playlist<select name="playlist" aria-label="Playlist" disabled={busy}>{lists.map(list=><option key={list.id} value={list.id}>{list.title}</option>)}</select></label><button className="secondary" disabled={busy}>Add to playlist</button><p role="status">{message}</p></form>;
}
export function PlaylistRemove({id,track}:{id:string;track?:string}) {
  const router=useRouter(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
  if(!track&&!confirm)return <button className="secondary" onClick={()=>setConfirm(true)}>Delete playlist</button>;
  return <><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await send(`/api/playlists/${id}${track?'/'+track:''}`,{},'DELETE');if(!track)router.push('/playlists');router.refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>{track?'Remove from playlist':'Confirm playlist deletion'}</button>{!track&&<button className="text-button" onClick={()=>setConfirm(false)}>Keep playlist</button>}<p role="alert">{message}</p></>;
}
