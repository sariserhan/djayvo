'use client';
import {useEffect,useRef,useState} from 'react';
const endpoint='http://127.0.0.1:48191';
type Controls={level:number;low:number;mid:number;high:number;tone:number;echo:number;bypass:boolean;roll:boolean;percussion:boolean};
type Status={protocolVersion:number;active:boolean;message:string;source:string;output:string;peak:number;bpm:number;confidence:number;controls:Controls};
const initial:Controls={level:.4,low:0,mid:0,high:0,tone:18000,echo:0,bypass:false,roll:false,percussion:false};
export function Companion({onConnectionChange}:{onConnectionChange:(connected:boolean)=>void}){
 const [code,setCode]=useState(''),[connected,setConnected]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState('Open Jamloom Live on this Mac, select a source and output, then copy its pairing code and paste it here.'),[status,setStatus]=useState<Status|null>(null),[controls,setControls]=useState(initial);
 const token=useRef(''),generation=useRef(0),queued=useRef<Controls|null>(null),sending=useRef(false),release=useRef<ReturnType<typeof setTimeout>|null>(null),holdUntil=useRef(0),callback=useRef(onConnectionChange);callback.current=onConnectionChange;
 async function command(path:string,method='GET',value?:Controls){
  const response=await fetch(endpoint+path,{method,headers:{Authorization:'Bearer '+token.current,...(value?{'Content-Type':'application/json'}:{})},body:value?JSON.stringify(value):undefined,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(2500)});
  if(!response.ok)throw Error(response.status===401?'Pairing expired. Pair again in Jamloom Live.':'The companion rejected this command. Reconnect from Jamloom Live.');
  const data=await response.json();if(data.protocolVersion!==1||typeof data.active!=='boolean'||!data.controls)throw Error('This companion version is incompatible.');return data as Status;
 }
 function disconnect(text='Disconnected. Capture stops within five seconds.',stopped=false){
  generation.current++;token.current='';queued.current=null;setConnected(false);setPending(false);setStatus(null);setMessage(text);
  if(release.current)clearTimeout(release.current);
  if(stopped)holdUntil.current=0;else if(connected)holdUntil.current=Date.now()+8000;
  const wait=holdUntil.current-Date.now();if(wait>0)release.current=setTimeout(()=>callback.current(false),wait);else callback.current(false);
 }
 useEffect(()=>{
  return()=>{generation.current++;token.current='';queued.current=null;if(release.current)clearTimeout(release.current);};
 },[]);
 useEffect(()=>{
  if(!connected)return;
  const stop=()=>{if(token.current)void fetch(endpoint+'/stop',{method:'POST',headers:{Authorization:'Bearer '+token.current},credentials:'omit',keepalive:true}).catch(()=>{});};
  let polling=false;const current=generation.current;
  const timer=setInterval(async()=>{if(polling)return;polling=true;try{const data=await command('/status');if(current===generation.current){setStatus(data);if(!sending.current&&!queued.current)setControls(data.controls);}}catch{if(current===generation.current)disconnect('Connection lost. Native capture stops within five seconds. Reconnect from Jamloom Live.');}finally{polling=false;}},1000);
  window.addEventListener('pagehide',stop);return()=>{clearInterval(timer);window.removeEventListener('pagehide',stop);stop();};
 },[connected]);
 async function connect(){
  if(!/^[a-f0-9]{64}$/.test(code))return;if(release.current)clearTimeout(release.current);const current=++generation.current;setPending(true);callback.current(true);token.current=code;
  try{const data=await command('/status');if(current!==generation.current)return;setStatus(data);setControls(data.controls);setConnected(true);setCode('');setMessage('Connected. Audio stays in Jamloom Live; this page controls its effects.');}
  catch{if(current===generation.current)disconnect('Could not connect. Open Jamloom Live and pair again. Allow local-network access if your browser asks, or use the native controls.');}
  finally{if(current===generation.current)setPending(false);}
 }
 async function update(next:Controls){
  setControls(next);queued.current=next;if(sending.current)return;sending.current=true;const current=generation.current;
  try{while(queued.current&&token.current&&current===generation.current){const value=queued.current;queued.current=null;const data=await command('/controls','POST',value);if(current===generation.current)setStatus(data);}}
  catch{if(current===generation.current)disconnect('Controls could not reach the companion. Native capture stops within five seconds.');}
  finally{sending.current=false;}
 }
 async function stop(){try{const data=await command('/stop','POST');setStatus(data);setControls(data.controls);return true;}catch{disconnect();return false;}}
 async function detach(){if(await stop())disconnect('Disconnected. Native capture is stopped.',true);}
 return <section className="product-panel" aria-labelledby="native-live-title"><h2 id="native-live-title">Mac Live Source</h2>
 <p>Use the Jamloom Live companion to process one permitted app through a selected stereo output. It requires macOS 14.2 or later. Capture starts only in the companion after you choose the source and confirm permission.</p>
 <div className="product-controls">
 {!connected&&<><label>Pairing code<input type="password" autoComplete="off" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={64}/></label><button className="primary" disabled={pending||!/^[a-f0-9]{64}$/.test(code)} onClick={()=>void connect()}>{pending?'Connecting…':'Connect companion'}</button></>}
 <p role="status" aria-live="polite">{message}</p>
 {connected&&<><p>{status?.active?'● Capture active':'Capture stopped'} · {status?.source||'No source selected'}{status?.output?' → '+status.output:''}</p><p>{status?.message}</p>
 {([['level','Native output level',0,.8,.01],['low','Low EQ (dB)',-24,6,1],['mid','Mid EQ (dB)',-24,6,1],['high','High EQ (dB)',-24,6,1],['tone','Native low-pass (Hz)',100,18000,100],['echo','Native echo',0,.4,.01]] as const).map(([key,label,min,max,step])=><label key={key}>{label}: {controls[key]}<input type="range" min={min} max={max} step={step} value={controls[key]} disabled={!status?.active} onChange={e=>void update({...controls,[key]:Number(e.target.value)})}/></label>)}
 {([['bypass','Bypass native effects'],['roll','One-beat roll'],['percussion','Follow a steady pulse with percussion']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={controls[key]} disabled={!status?.active} onChange={e=>void update({...controls,[key]:e.target.checked})}/>{label}</label>)}
 <output>Native peak: {(status?.peak??0).toFixed(3)} · {(status?.confidence??0)>.65?`Estimated pulse: ${status?.bpm.toFixed(1)} BPM (${Math.round((status?.confidence??0)*100)}% confidence)`:'Pulse uncertain; percussion waits.'}</output>
 <p>Roll uses 120 BPM while pulse timing is uncertain. This is an estimated pulse, not a verified beat grid.</p>
 <button className="secondary" onClick={()=>void stop()} disabled={!status?.active}>Stop native capture / panic</button><button className="secondary" onClick={()=>void detach()}>Disconnect companion</button></>}
 <p>Pairing expires after 15 minutes. Keep this page open: a lost connection stops capture within five seconds and releases the source’s original audio. No source audio is sent to the website. Protected or unsupported sources may be unavailable.</p>
 <p>The companion is an owner preview, not a public download. <a href="/learn/live-source">Routing and compatibility</a></p>
 </div></section>;
}
