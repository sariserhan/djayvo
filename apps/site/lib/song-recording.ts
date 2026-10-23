// Normalize only after the user confirms cloud creation; the original stays on their device.
export async function songRecording(file:Blob){
 if(file.size<1||file.size>100*1024*1024)throw Error('Choose an audio recording under 100 MB.');
 const context=new AudioContext();
 try{
  const decoded=await context.decodeAudioData(await file.arrayBuffer());
  if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>300)throw Error('Choose a recording of up to five minutes.');
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
  const samples=(await offline.startRendering()).getChannelData(0),buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
  const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){if(!Number.isFinite(samples[i]))throw Error('This recording could not be read.');view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);}
  const digest=await crypto.subtle.digest('SHA-256',buffer),sha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  return {audio:new Blob([buffer],{type:'audio/wav'}),bytes:buffer.byteLength,sha256};
 }finally{await context.close();}
}
