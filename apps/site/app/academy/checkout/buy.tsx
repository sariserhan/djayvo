'use client';
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
type Checkout={mount:(element:HTMLElement)=>void;destroy:()=>void};
type StripeFactory=(key:string)=>{createEmbeddedCheckoutPage:(options:{clientSecret:string;onComplete:()=>void})=>Promise<Checkout>};
export function AcademyBuy({enabled,mode}:{enabled:boolean;mode:'test'|'live'}){
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[open,setOpen]=useState(false),[complete,setComplete]=useState(false),[message,setMessage]=useState(''),[sessionId,setSessionId]=useState(''),[status,setStatus]=useState('pending');
 const container=useRef<HTMLDivElement>(null),checkout=useRef<Checkout|null>(null),key=useRef(''),active=useRef(true),request=useRef<AbortController|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;request.current?.abort();checkout.current?.destroy();};},[]);
 async function check(){try{const r=await fetch('/api/academy/checkout?session_id='+encodeURIComponent(sessionId),{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(active.current){setStatus(data.status);setMessage(data.status==='active'?'Your Academy access is verified.':data.status==='reversed'?'This purchase has been refunded or is under review.':'Checkout completed. Waiting for verified payment…');}}catch{if(active.current)setMessage('Payment verification is unavailable. Check again shortly; do not pay again.');}}
 useEffect(()=>{if(!complete||!sessionId)return;let attempts=0;void check();const timer=setInterval(()=>{if(++attempts>=15)clearInterval(timer);else void check();},2000);return()=>clearInterval(timer);},[complete,sessionId]); // Only the signed webhook can change this server-owned receipt.
 async function buy(){if(busy||checkout.current)return;setBusy(true);setMessage('Loading secure payment form…');request.current=new AbortController();
  try{key.current||=crypto.randomUUID();const r=await fetch('/api/academy/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key.current}),signal:request.current.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'Sign in with a verified account first.');
   const stripe=(window as unknown as {Stripe?:StripeFactory}).Stripe;if(!stripe)throw Error('Secure payment form did not load. Reload this page to try again.');
   if(!active.current)return;setSessionId(data.sessionId);
   const instance=await stripe(data.publishableKey).createEmbeddedCheckoutPage({clientSecret:data.clientSecret,onComplete:()=>{checkout.current?.destroy();checkout.current=null;if(active.current){setOpen(false);setComplete(true);}}});
   if(!active.current){instance.destroy();return;}checkout.current=instance;instance.mount(container.current!);setOpen(true);setMessage('');
  }catch(e){if(active.current)setMessage(e instanceof Error?e.message:'Checkout unavailable.');}finally{if(active.current)setBusy(false);}
 }
 return <>{enabled&&<Script src="https://js.stripe.com/endive/stripe.js" onReady={()=>setReady(true)} onError={()=>setMessage('Secure payment form could not load. Reload this page to retry.')}/>}
  {!open&&!complete&&<button disabled={!enabled||!ready||busy} onClick={buy}>{busy?'Loading payment form…':enabled?(mode==='test'?'Pay securely on Jamloom · test mode':'Pay securely on Jamloom'):'Complete Pass sales are not open'}</button>}
  <div ref={container} className="inline-checkout" aria-label="Secure payment form"/>
  {open&&<button className="secondary" onClick={()=>{checkout.current?.destroy();checkout.current=null;setOpen(false);setMessage('Payment form closed. You can reopen it here.');}}>Close payment form</button>}
  <p role="status">{message}</p>
  {complete&&<div className="checkout-confirmation"><h2>{status==='active'?'Academy access verified':'Payment confirmation'}</h2>{status!=='active'&&<button className="secondary" onClick={()=>void check()}>Check payment status</button>}<a href="/academy/learn">Open your learning dashboard →</a><p>No generation credits were charged or granted.</p></div>}
 </>;
}
