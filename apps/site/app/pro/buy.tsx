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

export function ProOffline(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('Save the web studio and practice tracks on this browser. Your recordings stay in their separate local library.');
 async function change(remove=false){setBusy(true);try{
  if(!('serviceWorker'in navigator)||!('caches'in window))throw Error('Offline storage is unavailable in this browser.');
  const scope=new URL('/studio/',location.href).href;
  if(remove){for(const r of await navigator.serviceWorker.getRegistrations())if(r.scope===scope)await r.unregister();for(const key of await caches.keys())if(key.startsWith(`djayvo-studio:${scope}:`))await caches.delete(key);setMessage('Offline studio removed. Saved music and sampler banks are unchanged.');}
  else{setMessage('Saving studio files…');const r=await navigator.serviceWorker.register('/studio/service-worker.js',{scope:'/studio/',updateViaCache:'none'}),worker=r.installing;
   if(worker)await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('Offline setup timed out. Try again.')),75000);function finish(error?:Error){clearTimeout(timer);worker!.removeEventListener('statechange',changed);error?reject(error):resolve();}function changed(){if(['installed','activated'].includes(worker!.state))finish();else if(worker!.state==='redundant')finish(Error('Could not save offline files. Check your connection and available storage.'));}worker.addEventListener('statechange',changed);changed();});
   setMessage('Web studio saved. Reopen the studio to use it offline for up to 30 days. Updates apply after all studio tabs close.');}
 }catch(e){setMessage(e instanceof Error?e.message:'Offline setup failed. Saved music is unchanged.');}finally{setBusy(false);}}
 return <details><summary>Use the web studio offline</summary><p role="status">{message}</p><button disabled={busy} onClick={()=>change()}>Keep web studio available offline</button> <button disabled={busy} onClick={()=>change(true)}>Remove offline studio</button></details>;
}
