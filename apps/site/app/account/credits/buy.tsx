'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CREDIT_PACKS} from '../../../lib/economics';
export function CreditBuy({enabled,live}:{enabled:boolean;live:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),keys=useRef<Record<string,string>>({}),router=useRouter();
 useEffect(()=>{
  const id=new URL(location.href).searchParams.get('session_id');if(!id)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>,attempts=0;
  async function check(){
   try{const r=await fetch('/api/payments/checkout?session_id='+encodeURIComponent(id!),{signal:AbortSignal.timeout(10000)}),data=await r.json();if(stopped)return;
    if(data.complete){setMessage('Payment verified. Your credits are ready.');router.refresh();return;}
    setMessage('Your payment is being confirmed. Please don’t pay again.');
   }catch{if(stopped)return;setMessage('We’re checking your payment. You can return to this page later.');}
   if(++attempts<15)timer=setTimeout(check,3000);
  }
  void check();return()=>{stopped=true;clearTimeout(timer);};
 },[router]);
 async function buy(pack:string){setBusy(true);setMessage('Opening secure payment…');try{
  keys.current[pack]??=crypto.randomUUID();const r=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pack,key:keys.current[pack]})});const data=await r.json();
  if(!r.ok)throw Error(data.error);const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Payment link unavailable.');location.assign(url.href);
 }catch(error){setMessage(error instanceof Error?error.message:'Could not open checkout.');setBusy(false);}}
 return <><h2>Add credits</h2><p>{live?'Choose a pack. Credits have no expiration.':'Test mode · no real payment or cash value.'}</p><div className="product-actions">{Object.entries(CREDIT_PACKS).map(([key,pack])=><button key={key} className="secondary" disabled={!enabled||busy} onClick={()=>buy(key)}>{pack.credits} credits · ${(pack.cents/100).toFixed(2)}</button>)}</div>{!enabled&&<p>Credit purchases are not open here yet.</p>}<p role="status">{message}</p></>;
}
