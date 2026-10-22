'use client';
import {useEffect,useRef,useState} from 'react';
const endpoint='http://127.0.0.1:48191';
type DeckControls={level:number;low:number;mid:number;high:number;tone:number;echo:number;bypass:boolean;roll:boolean;percussion:boolean;highpass:number;echoSeconds:number;loopBeats:number;tempo:number;scratchRate:number;reverse:boolean;scratch:boolean;mute:boolean};
type Controls={decks:DeckControls[];crossfader:number;master:number};
type DeckStatus={active:boolean;source:string;message:string;peak:number;bpm:number;confidence:number;bufferedSeconds:number};
type Status={protocolVersion:number;active:boolean;message:string;output:string;decks:DeckStatus[];controls:Controls};
const deckDefaults:DeckControls={level:.7,low:0,mid:0,high:0,tone:18000,echo:0,bypass:false,roll:false,percussion:false,highpass:20,echoSeconds:.3,loopBeats:1,tempo:120,scratchRate:0,reverse:false,scratch:false,mute:false};
const initial:Controls={decks:[{...deckDefaults},{...deckDefaults}],crossfader:.5,master:.9};
function Platter({name,active,controls,onScratch}:{name:string;active:boolean;controls:DeckControls;onScratch:(held:boolean,rate:number)=>void}){
 const gesture=useRef<{angle:number;time:number;pointer:number}|null>(null),callback=useRef(onScratch),idle=useRef<ReturnType<typeof setTimeout>|null>(null);
 callback.current=onScratch;
 const [rotation,setRotation]=useState(0),[dragging,setDragging]=useState(false);
 function end(){if(idle.current)clearTimeout(idle.current);if(gesture.current){gesture.current=null;setDragging(false);callback.current(false,0);}}
 useEffect(()=>{const release=()=>end();const hide=()=>{if(document.hidden)end();};window.addEventListener('blur',release);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',hide);if(idle.current)clearTimeout(idle.current);};},[]);
 useEffect(()=>{if(!active)end();},[active]);
 function angle(e:React.PointerEvent<HTMLButtonElement>){const r=e.currentTarget.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2);}
 return <button type="button" className="mini-platter live-platter" disabled={!active} aria-label={`${name} platter`} aria-describedby={`platter-hint-${name.slice(-1)}`} data-playing={active&&!dragging&&!controls.scratch} data-reverse={controls.reverse} data-dragging={dragging}
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);gesture.current={angle:angle(e),time:performance.now(),pointer:e.pointerId};setDragging(true);callback.current(true,0);}}
 onPointerMove={e=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;const a=angle(e),now=performance.now();let delta=a-g.angle;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;const rate=Math.max(-2,Math.min(2,delta/Math.max(.008,(now-g.time)/1000)*1.8/(Math.PI*2)));setRotation(r=>r+delta*180/Math.PI);gesture.current={angle:a,time:now,pointer:e.pointerId};callback.current(true,rate);if(idle.current)clearTimeout(idle.current);idle.current=setTimeout(()=>{if(gesture.current)callback.current(true,0);},100);}}
 onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onBlur={end}>
 <span className="platter-label" style={dragging?{animation:'none',transform:`rotate(${rotation}deg)`}:undefined}><span>{name}</span><i/></span></button>;
}
export function Companion({onConnectionChange}:{onConnectionChange:(connected:boolean)=>void}){
 const [code,setCode]=useState(''),[connected,setConnected]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState('Open Jamloom Live on this Mac, select a source and output, then copy its pairing code and paste it here.'),[status,setStatus]=useState<Status|null>(null),[controls,setControls]=useState(initial);
 const latestControls=useRef(initial),revision=useRef(0);
 const token=useRef(''),generation=useRef(0),queued=useRef<Controls|null>(null),sending=useRef(false),release=useRef<ReturnType<typeof setTimeout>|null>(null),holdUntil=useRef(0),callback=useRef(onConnectionChange);callback.current=onConnectionChange;
 async function command(path:string,method='GET',value?:Controls){
  const response=await fetch(endpoint+path,{method,headers:{Authorization:'Bearer '+token.current,...(value?{'Content-Type':'application/json'}:{})},body:value?JSON.stringify(value):undefined,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(2500)});
  if(!response.ok)throw Error(response.status===401?'Pairing expired. Pair again in Jamloom Live.':'The companion rejected this command. Reconnect from Jamloom Live.');
  const data=await response.json();if(data.protocolVersion!==2||typeof data.active!=='boolean'||!Array.isArray(data.controls?.decks)||data.controls.decks.length!==2||!Array.isArray(data.decks)||data.decks.length!==2)throw Error('Update Jamloom Live to use the two-deck controls.');return data as Status;
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
  catch{if(current===generation.current)disconnect('Could not connect. Open the latest Jamloom Live and pair again. Allow local-network access if your browser asks. If it blocks loopback connections, use the native controls or another supported browser.');}
  finally{if(current===generation.current)setPending(false);}
 }
 function change(index:number,patch:Partial<DeckControls>,effect=true){
  const next=latestControls.current;void update({...next,decks:next.decks.map((deck,i)=>i===index?{...deck,...patch,...(effect?{bypass:false}:{})}:deck)});
 }
 function mix(patch:Partial<Omit<Controls,'decks'>>){void update({...latestControls.current,...patch});}
 async function update(next:Controls){
  revision.current++;latestControls.current=next;setControls(next);queued.current=next;if(sending.current)return;sending.current=true;const current=generation.current;
  try{while(queued.current&&token.current&&current===generation.current){const value=queued.current,sentRevision=revision.current;queued.current=null;const data=await command('/controls','POST',value);if(current===generation.current&&sentRevision===revision.current)setStatus(data);}}
  catch{if(current===generation.current)disconnect('Controls could not reach the companion. Native capture stops within five seconds.');}
  finally{sending.current=false;}
 }
 async function stop(){revision.current++;queued.current=null;try{const data=await command('/stop','POST');setStatus(data);latestControls.current=data.controls;setControls(data.controls);return true;}catch{disconnect();return false;}}
 async function detach(){if(await stop())disconnect('Disconnected. Native capture is stopped.',true);}
 return <section className="product-panel native-deck-panel" aria-labelledby="native-live-title">
 <div className="live-deck-heading"><div><p className="eyebrow">JAMLOOM / LIVE TWO DECKS</p><h2 id="native-live-title">Mix two sources. Make it yours.</h2></div><span className="live-deck-state">{status?.active?'● LIVE':connected?'CONNECTED':'NOT CONNECTED'}</span></div>
 {!connected&&<div className="live-pairing"><p>Open Jamloom Live on this Mac. Choose a different playing app for each deck and your output, then copy its pairing code.</p><div className="product-controls"><label>Pairing code<input type="password" autoComplete="off" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={64}/></label><button className="primary" disabled={pending||!/^[a-f0-9]{64}$/.test(code)} onClick={()=>void connect()}>{pending?'Connecting…':'Connect companion'}</button></div></div>}
 <p role="status" aria-live="polite">{message}</p>
 <fieldset className="live-master-mixer" disabled={!connected||!status?.active}><legend>Master mixer</legend><label className="live-control"><span>A ← Crossfader → B<span className="live-value">{Math.round(controls.crossfader*100)}%</span></span><input aria-label="Crossfader" type="range" min="0" max="1" step=".01" value={controls.crossfader} onChange={e=>mix({crossfader:Number(e.target.value)})}/></label><button className="secondary" onClick={()=>mix({crossfader:.5})}>Center</button><label className="live-control"><span>Master level<span className="live-value">{Math.round(controls.master*100)}%</span></span><input aria-label="Master level" type="range" min="0" max="1" step=".01" value={controls.master} onChange={e=>mix({master:Number(e.target.value)})}/></label></fieldset>
 <div className="live-console" data-connected={connected}>
 {controls.decks.map((deck,index)=>{const name=`Deck ${index===0?'A':'B'}`,source=status?.decks[index],active=connected&&Boolean(source?.active);
 const fader=(key:'low'|'mid'|'high'|'tone'|'highpass'|'echo'|'echoSeconds'|'tempo'|'level',label:string,min:number,max:number,step:number,effect=true)=><label className="live-control" key={key}><span>{label}<span className="live-value">{key==='level'?`${Math.round(deck[key]*100)}%`:deck[key]}</span></span><input aria-label={`${name} ${label}`} type="range" min={min} max={max} step={step} value={deck[key]} onChange={e=>change(index,{[key]:Number(e.target.value)},effect)}/></label>;
 return <section className="live-source-deck" key={name} data-deck={index===0?'A':'B'} aria-label={name}>
 <div className="deck-readout"><span>{name.toUpperCase()} / {deck.scratch?'SCRATCH':deck.reverse?'REVERSE':deck.roll?'LOOP':'LIVE'}</span><strong>{source?.source||'Choose a source in Jamloom Live'}</strong><small>{source?.active?'Capturing on your Mac':'Start this deck in Jamloom Live'}</small></div>
 <Platter name={name} active={active} controls={deck} onScratch={(scratch,scratchRate)=>change(index,{scratch,scratchRate},false)}/>
 <p className="live-deck-hint" id={`platter-hint-${name.slice(-1)}`}>Drag the record forward or backward. Use Reverse and Beat loop with a keyboard.</p>
 <div className="live-pulse">{(source?.confidence??0)>.65?`${source?.bpm.toFixed(1)} BPM · estimated`:'Listening for a steady pulse'} · {(source?.bufferedSeconds??0).toFixed(1)}s buffered</div>
 <label className="live-meter">{name} peak <meter min="0" max="1" value={Math.min(1,Math.max(0,source?.peak??0))}/><span>{(source?.peak??0).toFixed(3)}</span></label>
 <fieldset className="live-mixer" disabled={!active}><legend>{name} controls</legend>
 <div className="live-pads">{([['reverse','Reverse'],['roll','Beat loop'],['mute','Mute']] as const).map(([key,label])=><button key={key} type="button" aria-label={`${name} ${label}`} aria-pressed={deck[key]} onClick={()=>change(index,{[key]:!deck[key]},false)}>{label}</button>)}</div>
 <button className="secondary" onClick={()=>change(index,{roll:false,reverse:false,scratch:false,scratchRate:0},false)} aria-label={`${name} Return to live`}>Return to live ↗</button>
 <div className="live-pair-controls"><label className="live-control"><span>Loop length</span><select aria-label={`${name} Loop length`} value={deck.loopBeats} onChange={e=>change(index,{loopBeats:Number(e.target.value)},false)}>{[.25,.5,1,2,4].map(n=><option value={n} key={n}>{n} beat{n===1?'':'s'}</option>)}</select></label>{fader('tempo','FX tempo (BPM)',60,200,1,false)}</div>
 {(source?.confidence??0)>.65&&<button className="secondary" onClick={()=>change(index,{tempo:Math.min(200,Math.max(60,Math.round(source!.bpm)))},false)}>Use estimated BPM for {name}</button>}
 <div className="live-eq">{fader('low','Low EQ (dB)',-24,6,1)}{fader('mid','Mid EQ (dB)',-24,6,1)}{fader('high','High EQ (dB)',-24,6,1)}</div>
 <div className="live-pair-controls">{fader('highpass','High-pass (Hz)',20,4000,10)}{fader('tone','Low-pass (Hz)',100,18000,100)}{fader('echo','Echo',0,.4,.01)}{fader('echoSeconds','Echo time (s)',.05,1,.01)}</div>
 <div className="live-pads">{([['percussion','Percussion'],['bypass','Bypass FX']] as const).map(([key,label])=><button type="button" key={key} aria-label={`${name} ${label}`} aria-pressed={deck[key]} onClick={()=>change(index,{[key]:!deck[key]},key!=='bypass')}>{label}</button>)}<button type="button" aria-label={`${name} Reset FX`} onClick={()=>change(index,{low:0,mid:0,high:0,tone:18000,highpass:20,echo:0,echoSeconds:.3,percussion:false})}>Reset FX</button></div>
 <div className="live-fx-status" data-bypassed={deck.bypass}><strong>{deck.bypass?'FX BYPASSED':'FX ON'}</strong><span>{deck.bypass?'Move an effect to turn FX back on.':'Percussion follows a steady pulse.'}</span></div>
 {fader('level','Channel level',0,.8,.01,false)}
 </fieldset><p className="live-deck-hint">{source?.message||'Capture starts only in the companion.'}</p></section>;})}
 </div>

 <p className="live-deck-hint">{status?.output||'One shared output'} · Mute silences a deck while capture stays on. Stopping capture restores the app’s original audio.</p>
 <button className="secondary live-panic" onClick={()=>void stop()} disabled={!status?.active}>Stop native capture / panic</button>
 {connected&&<div className="live-connection"><p>{status?.active?'● Capture active':'Capture stopped'} · {status?.message}</p><button className="secondary" onClick={()=>void detach()}>Disconnect companion</button></div>}
 <details className="live-details"><summary>How live decks work</summary><p>Select two different audio processes in the companion. Two tabs in the same browser may share a process; use different apps for independent sources. Both decks play through your chosen output.</p><p>Scratch, reverse and loops use up to four seconds of recent audio. Your source apps keep playing. Return to live rejoins their current audio. FX tempo controls loop length; it does not change the source’s tempo or provide beatmatching. Play, pause and seek in the source app.</p><p>Requires macOS 14.2 or later. Capture starts in the companion after source selection and permission. Pairing expires after 15 minutes; losing this page’s connection stops capture within five seconds. No source audio is sent to the website. Protected or unsupported sources may be unavailable.</p><p>The companion is an owner preview. <a href="/learn/live-source">Routing and compatibility</a></p></details>
 </section>;
}
