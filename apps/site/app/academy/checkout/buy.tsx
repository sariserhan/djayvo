'use client';import {useState} from 'react';
export function AcademyBuy({sandbox}:{sandbox:boolean}){const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function buy(){setBusy(true);try{const r=await fetch('/api/academy/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:crypto.randomUUID()})});const data=await r.json();if(!r.ok)throw Error(data.error||'Sign in with a verified account first.');location.assign(data.url);}catch(e){setMessage(e instanceof Error?e.message:'Checkout unavailable');setBusy(false);}}
 return <><button disabled={!sandbox||busy} onClick={buy}>{busy?'Opening Stripe…':sandbox?'Open Stripe sandbox checkout':'Complete Pass sales are not open'}</button><p role="status">{message}</p></>;}
