'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const directions=['hiphop','reggae','experimental','club','funk','call_response','hybrid'];
async function result(response:Response) {
  const value=await response.json();
  if (!response.ok) throw Object.assign(new Error(value.error || 'Account saving failed. Your local mix is safe.'),{status:response.status});
  return value;
}
export function SaveMix() {
  const router=useRouter(), form=useRef<HTMLFormElement>(null);
  const request=useRef({identity:'',id:crypto.randomUUID()});
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  return <form ref={form} className="account-form save-mix" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage('Checking your selected mix…'); setError('');
    try {
      const values=new FormData(event.currentTarget), file=values.get('audio') as File;
      if (!file || file.size<3840044 || file.size>7680044) throw new Error('Choose a 20–40 second stereo WAV downloaded from Djayvo.');
      const bytes=await file.arrayBuffer();
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
      const title=String(values.get('title')).trim(), strategy=String(values.get('strategy'));
      const identity=JSON.stringify({sha256,title,strategy});
      if (request.current.identity!==identity) request.current={identity,id:crypto.randomUUID()};
      const intent=await result(await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:request.current.id,title,strategy,sha256,bytes:file.size,consent:values.get('consent')==='on'})}));
      if (!intent.ready) {
        setMessage('Uploading this mix privately…');
        const upload=await fetch(intent.url,{method:'PUT',body:bytes,headers:{'Content-Type':'audio/wav'},credentials:new URL(intent.url,location.href).origin===location.origin?'same-origin':'omit'});
        if (!upload.ok) throw new Error('Upload did not finish. Your local file is safe; retry the save.');
        setMessage('Verifying the saved audio…');
        await result(await fetch(`/api/library/${intent.id}/finalize`,{method:'POST'}));
      }
      setMessage('Saved privately to your account. Your local copy is unchanged.');
      form.current?.reset(); request.current={identity:'',id:crypto.randomUUID()}; router.refresh();
    } catch(e) {
      if (e && typeof e==='object' && 'status' in e && e.status===409) request.current.identity='';
      setMessage(''); setError(e instanceof Error?e.message:'Save failed. Your local file is safe.');
    }
    finally { setBusy(false); }
  }}>
    <h2>Save a finished mix</h2>
    <p>Download a mix from the studio, then choose that WAV here. Saving uploads this mix to your private account; it does not publish it.</p>
    <label>Mix title<input name="title" required maxLength={120} disabled={busy}/></label>
    <label>Musical direction<select name="strategy" aria-label="Musical direction" disabled={busy}>{directions.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
    <label>Finished WAV<input name="audio" type="file" accept="audio/wav,.wav" required disabled={busy}/></label>
    <label className="save-consent"><input name="consent" type="checkbox" required disabled={busy}/>I have permission to store this mix online, including any recognizable voices.</label>
    <button type="submit" className="primary" disabled={busy}>{busy?'Saving…':'Save privately'}</button>
    <p role="status" className="account-message">{message}</p><p role="alert" className="account-error">{error}</p>
  </form>;
}
export function TrackControls({id,title}:{id:string;title:string}) {
  const router=useRouter(), [confirm,setConfirm]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState('');
  return <div className="track-actions"><audio controls preload="none" aria-label={`Play ${title}`} src={`/api/library/${id}/audio`}/>
    <a href={`/api/library/${id}/audio?download=1`} download="djayvo-mix.wav">Download WAV</a>
    {!confirm ? <button className="secondary" onClick={()=>setConfirm(true)}>Remove from account</button> : <div><p>Remove this saved mix? Your local copy stays on your device.</p>
      <button className="danger" disabled={busy} onClick={async()=>{setBusy(true);setError('');try {await result(await fetch(`/api/library/${id}/audio`,{method:'DELETE'}));router.refresh();}catch(e){setError(e instanceof Error?e.message:'Removal failed. Try again.');}finally{setBusy(false);}}}>Confirm removal</button>
      <button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Keep mix</button></div>}
    <p role="alert">{error}</p></div>;
}
