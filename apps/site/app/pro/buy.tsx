'use client';
import {useState,useRef} from 'react';
export function ProBuy({enabled}:{enabled:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const key=useRef('');
 async function buy(){if(busy)return;setBusy(true);setMessage('');try{key.current||=crypto.randomUUID();const r=await fetch('/api/pro/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key.current})});const data=await r.json();if(!r.ok)throw Error(data.error);const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Invalid payment destination');window.location.assign(url.href);}catch(e){setMessage(e instanceof Error?e.message:'Checkout unavailable.');setBusy(false);}}
 return <><button disabled={!enabled||busy} onClick={buy}>{busy?'Opening secure checkout…':enabled?'Buy Pro v1 — $49 once':'Pro purchases are being prepared'}</button><p role="status">{message}</p></>;
}

export function ProConfirmation(){
 const [message,setMessage]=useState('Your payment is being verified. Do not pay again.');
 async function check(){try{const r=await fetch('/api/pro/access',{cache:'no-store'});if(!r.ok)throw Error();if((await r.json()).active)window.location.replace('/pro');else setMessage('Verification is still pending. Check again shortly; do not pay again.');}catch{setMessage('Verification is temporarily unavailable. Contact support if this continues; do not pay again.');}}
 return <><p role="status">{message}</p><button onClick={check}>Check payment status</button></>;
}
