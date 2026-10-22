'use client';
import {useEffect,useRef,useState} from 'react';
const endpoint='http://127.0.0.1:48191';
type Controls={level:number;low:number;mid:number;high:number;tone:number;echo:number;bypass:boolean;roll:boolean;percussion:boolean};
type Status={protocolVersion:number;active:boolean;message:string;source:string;output:string;peak:number;bpm:number;confidence:number;controls:Controls};
const initial:Controls={level:.4,low:0,mid:0,high:0,tone:18000,echo:0,bypass:false,roll:false,percussion:false};
export function Companion({onConnectionChange}:{onConnectionChange:(connected:boolean)=>void}){
 const [code,setCode]=useState(''),[connected,setConnected]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState('Open Jamloom Live on this Mac, select a source and output, then copy its pairing code and paste it here.'),[status,setStatus]=useState<Status|null>(null),[controls,setControls]=useState(initial);
 const latestControls=useRef(initial),revision=useRef(0);
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
  const timer=setInterval(async()=>{if(polling||sending.current||queued.current)return;polling=true;const startedRevision=revision.current;try{const data=await command('/status');if(current===generation.current&&startedRevision===revision.current&&!sending.current&&!queued.current){setStatus(data);latestControls.current=data.controls;setControls(data.controls);}}catch{if(current===generation.current)disconnect('Connection lost. Native capture stops within five seconds. Reconnect from Jamloom Live.');}finally{polling=false;}},1000);
  window.addEventListener('pagehide',stop);return()=>{clearInterval(timer);window.removeEventListener('pagehide',stop);stop();};
 },[connected]);
 async function connect(){
  if(!/^[a-f0-9]{64}$/.test(code))return;if(release.current)clearTimeout(release.current);const current=++generation.current;setPending(true);callback.current(true);token.current=code;
  try{const data=await command('/status');if(current!==generation.current)return;setStatus(data);latestControls.current=data.controls;setControls(data.controls);setConnected(true);setCode('');setMessage('Connected. Audio stays in Jamloom Live; this page controls its effects.');}
  catch{if(current===generation.current)disconnect('Could not connect. Open Jamloom Live and pair again. Allow local-network access if your browser asks. If it blocks loopback connections, use the native controls or another supported browser.');}
  finally{if(current===generation.current)setPending(false);}
 }
 function change(patch:Partial<Controls>,effect=true){
  void update({...latestControls.current,...patch,...(effect?{bypass:false}:{})});
 }
 async function update(next:Controls){
  revision.current++;latestControls.current=next;setControls(next);queued.current=next;if(sending.current)return;sending.current=true;const current=generation.current;
  try{while(queued.current&&token.current&&current===generation.current){const value=queued.current,sentRevision=revision.current;queued.current=null;const data=await command('/controls','POST',value);if(current===generation.current&&sentRevision===revision.current)setStatus(data);}}
  catch{if(current===generation.current)disconnect('Controls could not reach the companion. Native capture stops within five seconds.');}
  finally{sending.current=false;}
 }
 async function stop(){revision.current++;queued.current=null;try{const data=await command('/stop','POST');setStatus(data);latestControls.current=data.controls;setControls(data.controls);return true;}catch{disconnect();return false;}}
 async function detach(){if(await stop())disconnect('Disconnected. Native capture is stopped.',true);}
 return <section className="product-panel native-deck-panel" aria-labelledby="native-live-title">
 <div className="live-deck-heading"><div><p className="eyebrow">JAMLOOM / LIVE DECK</p><h2 id="native-live-title">Mac Live Source</h2></div><span className="live-deck-state">{status?.active?'● LIVE':connected?'CONNECTED':'NOT CONNECTED'}</span></div>
 {!connected&&<div className="live-pairing"><p>Open Jamloom Live on this Mac. Choose your source and output, then copy its pairing code.</p><div className="product-controls"><label>Pairing code<input type="password" autoComplete="off" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={64}/></label><button className="primary" disabled={pending||!/^[a-f0-9]{64}$/.test(code)} onClick={()=>void connect()}>{pending?'Connecting…':'Connect companion'}</button></div></div>}
 <p role="status" aria-live="polite">{message}</p>
 <div className="live-console" data-connected={connected}>
  <div className="live-source-deck">
   <div className="deck-readout"><span>LIVE SOURCE</span><strong>{status?.source||'Choose a source in Jamloom Live'}</strong><small>{status?.output||'Audio stays on your Mac'}</small></div>
   <div className="mini-platter live-platter" data-playing={Boolean(status?.active&&(status?.peak??0)>0)} aria-hidden="true"><span className="platter-label"><span>LIVE</span><i/></span></div>
   <div className="live-pulse">{(status?.confidence??0)>.65?`${status?.bpm.toFixed(1)} BPM · estimated`:'Listening for a steady pulse'}</div>
   <label className="live-meter">Output peak <meter min="0" max="1" value={Math.min(1,Math.max(0,status?.peak??0))}/><output>{(status?.peak??0).toFixed(3)}</output></label>
   <p className="live-deck-hint">Play, pause and seek in your source app.</p>
   <button className="secondary live-panic" onClick={()=>void stop()} disabled={!status?.active}>Stop native capture / panic</button>
  </div>
  <fieldset className="live-mixer" disabled={!connected||!status?.active}><legend>Live effects</legend>
   <div className="live-fx-status" data-bypassed={controls.bypass}><strong>{controls.bypass?'FX BYPASSED':'FX ON'}</strong><span>{controls.bypass?'Dry signal. Move an effect to turn FX back on.':'EQ, filter and echo shape your source.'}</span></div>
   <div className="live-eq">{([['low','Low EQ (dB)'],['mid','Mid EQ (dB)'],['high','High EQ (dB)']] as const).map(([key,label])=><label key={key} className="live-control"><span>{label}<span className="live-value">{controls[key]}</span></span><input type="range" min="-24" max="6" step="1" value={controls[key]} onChange={e=>change({[key]:Number(e.target.value)})}/></label>)}</div>
   {([['tone','Native low-pass (Hz)',100,18000,100],['echo','Native echo',0,.4,.01]] as const).map(([key,label,min,max,step])=><label key={key} className="live-control"><span>{label}<span className="live-value">{controls[key]}</span></span><input type="range" min={min} max={max} step={step} value={controls[key]} onChange={e=>change({[key]:Number(e.target.value)})}/></label>)}
   <div className="live-pads">{([['roll','One-beat roll'],['percussion','Follow a steady pulse with percussion'],['bypass','Bypass native effects']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={controls[key]} onChange={e=>change({[key]:e.target.checked},key!=='bypass')}/><span>{label}</span></label>)}</div>
   <p className="live-deck-hint">Roll repeats the last beat. Percussion waits for a steady pulse.</p>
   <label className="live-control live-master"><span>Native output level<span className="live-value">{Math.round(controls.level*100)}%</span></span><input type="range" min="0" max="0.8" step="0.01" value={controls.level} onChange={e=>change({level:Number(e.target.value)},false)}/></label>
  </fieldset>
 </div>
 {connected&&<div className="live-connection"><p>{status?.active?'● Capture active':'Capture stopped'} · {status?.message}</p><button className="secondary" onClick={()=>void detach()}>Disconnect companion</button></div>}
 <details className="live-details"><summary>Connection and routing</summary><p>Requires macOS 14.2 or later. Capture starts in the companion after source selection and permission. Pairing expires after 15 minutes; losing this page’s connection stops capture within five seconds and releases the source’s original audio. No source audio is sent to the website.</p><p>Roll uses 120 BPM while pulse timing is uncertain. Pulse is an estimate, not a verified beat grid. Protected or unsupported sources may be unavailable.</p><p>The companion is an owner preview, not a public download. <a href="/learn/live-source">Routing and compatibility</a></p></details>
 </section>;
}
