'use client';
import {useEffect,useRef,useState} from 'react';
import {Companion} from './companion';
import {liveGraph} from '../../lib/live-source';
export function LiveSource(){
 const [nativeConnected,setNativeConnected]=useState(false);
 const [consent,setConsent]=useState(false),[isolated,setIsolated]=useState(false),[active,setActive]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState('No source selected.'),[level,setLevel]=useState(.4),[tone,setTone]=useState(18000),[echo,setEcho]=useState(0),[bypass,setBypass]=useState(false),[peak,setPeak]=useState(0);
 const session=useRef<{context:AudioContext;stream:MediaStream;graph:ReturnType<typeof liveGraph>}|null>(null),generation=useRef(0),warming=useRef<AudioContext|null>(null);
 function dispose(){const pendingContext=warming.current;warming.current=null;if(pendingContext)void pendingContext.close();const old=session.current;session.current=null;if(old){old.stream.getTracks().forEach(t=>t.stop());old.graph.stop();void old.context.close();}}
 function stop(){generation.current++;dispose();setActive(false);setPending(false);setIsolated(false);setPeak(0);setMessage('Capture stopped. Check the source application’s own volume.');}
 useEffect(()=>()=>{generation.current++;dispose();},[]);
 useEffect(()=>{session.current?.graph.set(isolated?level:0,tone,echo,bypass);},[isolated,level,tone,echo,bypass,active]);
 useEffect(()=>{if(!active)return;const data=new Float32Array(256);const timer=setInterval(()=>{session.current?.graph.meter.getFloatTimeDomainData(data);setPeak(Math.max(...data.map(Math.abs)));},150);return()=>clearInterval(timer);},[active]);
 async function start(){
  if(!consent||pending||active||nativeConnected)return;
  if(!navigator.mediaDevices?.getDisplayMedia){setMessage('Tab audio capture is unavailable in this browser. Use the local DJ studio instead.');return;}
  const token=++generation.current;setPending(true);let stream:MediaStream|undefined,context:AudioContext|undefined;
  try{
   context=new AudioContext();warming.current=context;
   // Unlock output in the click gesture, before the asynchronous source chooser.
   const resumed=context.resume().then(()=>true,()=>false);
   // Video selection is required by the capture API; Jamloom never displays, stores or uploads frames.
   stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:{suppressLocalAudioPlayback:true} as MediaTrackConstraints});
   if(token!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
   if(!stream.getAudioTracks().length)throw new Error('The selected source supplied no audio. Select a permitted tab and enable Share audio.');
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{const ok=await Promise.race([resumed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Audio did not start. Stop capture and try again.')),10000);})]);if(!ok)throw new Error('Audio output could not start.');}finally{clearTimeout(timer);}
   if(token!==generation.current){stream.getTracks().forEach(t=>t.stop());await context.close();return;}
   const graph=liveGraph(context,stream);warming.current=null;session.current={context,stream,graph};
   stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(token===generation.current)stop();},{once:true}));
   setActive(true);setMessage('Capturing selected source locally. Monitoring stays muted until you confirm isolated output.');
  }catch(error){stream?.getTracks().forEach(t=>t.stop());if(context&&context.state!=='closed')void context.close();if(token===generation.current){warming.current=null;setMessage(error instanceof Error?error.message:'Capture failed. Try a supported desktop browser.');}}
  finally{if(token===generation.current)setPending(false);}
 }
 return <><Companion onConnectionChange={connected=>{setNativeConnected(connected);if(connected)stop();}}/><section className="product-panel"><h2>Browser Live Source</h2><p>Select audio you have permission to process. Do not select Jamloom’s own output. There is no recording or upload.</p><div className="product-controls">
 <label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)stop();}}/>I have permission to capture and process this source.</label>
 <button className="primary" disabled={!consent||active||pending||nativeConnected} onClick={start}>{pending?'Waiting for source selection…':'Select tab audio'}</button>
 <p role="status">{active?'● Capture active. ':''}{message}</p>
 <label><input type="checkbox" checked={isolated} disabled={!active} onChange={e=>setIsolated(e.target.checked)}/>I have confirmed the original source is not also playing through my speakers. Enable processed monitoring.</label>
 <p>Browsers may ignore local-playback suppression. Confirm routing before monitoring; Jamloom cannot mute external applications or guarantee no doubled sound.</p>
 <label>Output level: {Math.round(level*100)}%<input type="range" min="0" max="0.8" step="0.01" value={level} disabled={!active} onChange={e=>setLevel(Number(e.target.value))}/></label>
 <label>Low-pass tone: {tone} Hz<input type="range" min="100" max="18000" step="100" value={tone} disabled={!active} onChange={e=>setTone(Number(e.target.value))}/></label>
 <label>Echo amount: {Math.round(echo*100)}%<input type="range" min="0" max="0.4" step="0.01" value={echo} disabled={!active} onChange={e=>setEcho(Number(e.target.value))}/></label>
 <label><input type="checkbox" checked={bypass} disabled={!active} onChange={e=>setBypass(e.target.checked)}/>Bypass effects</label>
 <output>Measured output peak: {peak>0?20*Math.log10(peak)<-90?'below −90 dBFS':`${(20*Math.log10(peak)).toFixed(1)} dBFS`:'silent'}</output>
 <button className="secondary" onClick={()=>{setIsolated(false);stop();}} disabled={!active&&!pending}>Stop capture / panic</button>
 <p>No cloud charge. Browser capture cannot guarantee isolation; Mac native capture and effects are available in the companion owner preview. Use headphones while testing.</p></div></section></>;
}
