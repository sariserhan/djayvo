'use client';
import {useState} from 'react';
export function ContactForm({kind}:{kind:'contact'|'support'}){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 return <form className="admin-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setStatus('Sending…');try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,name:f.get('name'),email:f.get('email'),subject:f.get('subject'),body:f.get('body')})}),data=await r.json();if(!r.ok)throw new Error(data.error??'Could not send your message.');setSent(true);setStatus('Message received. Your reference: '+data.id+'. We will reply by email.');}catch(e){setStatus(e instanceof Error?e.message:'Could not send. Please try again.');}finally{setBusy(false);}}}>
 {!sent&&<><label>Your name<input autoComplete="name" name="name" maxLength={80} required/></label><label>Email for our reply<input type="email" name="email" autoComplete="email" maxLength={254} required/></label><label>Subject<input name="subject" maxLength={120} required/></label><label>Message<textarea name="body" rows={7} maxLength={5000} required/></label><p>Please do not include passwords, payment-card details or private recordings. Your message and email are shared with the Jamloom owner to handle your request. <a href="/privacy">Privacy details</a>.</p><button disabled={busy}>{busy?'Sending…':'Send message'}</button></>}<p role="status">{status}</p>
 </form>;
}
