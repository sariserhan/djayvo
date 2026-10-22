export async function livePhraseCapture(context, signal, phrase, failed) {
  let stream,node,source,muted,closed=false;
  const stop=()=>{closed=true;source?.disconnect();node?.port.postMessage('stop');node?.disconnect();node?.port.close();muted?.disconnect();stream?.getTracks().forEach(t=>t.stop());navigator.mediaDevices.removeEventListener('devicechange',changed);context.removeEventListener('statechange',state);signal.removeEventListener('abort',stop);};
  const changed=()=>{stop();failed(new Error('Input devices changed. Recheck headphones and restart.'));};
  const state=()=>{if(context.state!=='running'){stop();failed(new Error('Audio interrupted. Restart when ready.'));}};
  signal.addEventListener('abort',stop,{once:true});
  navigator.mediaDevices.addEventListener('devicechange',changed);context.addEventListener('statechange',state);
  try{
    if(signal.aborted||closed)throw Error('Capture cancelled');
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    if(signal.aborted||closed)throw Error('Capture cancelled');
    stream.getTracks().forEach(t=>t.addEventListener('ended',changed,{once:true}));
    await context.audioWorklet.addModule('./phrase-worklet.js');
    if(signal.aborted||closed)throw Error('Capture cancelled');
    if(stream.getAudioTracks().some(t=>t.readyState!=='live'))throw Error('Microphone disconnected');
    node=new AudioWorkletNode(context,'jamloom-phrase-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    source=context.createMediaStreamSource(stream);muted=context.createGain();muted.gain.value=0;source.connect(node);node.connect(muted);muted.connect(context.destination);
    node.onprocessorerror=()=>{stop();failed(new Error('Phrase capture stopped unexpectedly.'));};
    node.port.onmessage=({data})=>{if(!signal.aborted&&!closed){stream.getTracks().forEach(t=>t.enabled=false);phrase(data);}};
    return {listen(buffer=new ArrayBuffer(context.sampleRate*5*4)){if(signal.aborted||closed)return;node.port.postMessage(buffer,[buffer]);stream.getTracks().forEach(t=>t.enabled=true);},stop};
  }catch(error){stop();throw error;}
}
