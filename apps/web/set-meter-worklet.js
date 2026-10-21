class SetMeter extends AudioWorkletProcessor {
 constructor(){super();this.armed=false;this.warmNext=-1;this.warmCount=0;this.frames=0;this.count=0;this.sum=0;this.peak=0;this.next=-1;this.gaps=0;this.done=false;this.port.onmessage=({data})=>{if(data?.type==='stop'){this.flush();this.done=true;this.port.postMessage({type:'stopped',frames:this.frames,rate:sampleRate,gaps:this.gaps});}};}
 flush(){if(!this.count)return;this.port.postMessage({type:'meter',frames:this.frames,rate:sampleRate,peak:this.peak,rms:Math.sqrt(this.sum/(this.count*2)),gaps:this.gaps});this.count=0;this.sum=0;this.peak=0;}
 process(inputs,outputs){if(this.done)return false;const input=inputs[0],left=input[0],right=input[1]??left,n=outputs[0][0].length;
  // A newly connected node may render once before it has an input; start at the first connected block.
  if(!this.armed){if(!left)return true;this.warmCount=currentFrame===this.warmNext?this.warmCount+1:0;this.warmNext=currentFrame+n;if(this.warmCount<2)return true;this.armed=true;this.port.postMessage({type:'ready'});}
  if(this.next>=0&&currentFrame!==this.next)this.gaps++;this.next=currentFrame+n;
  for(let i=0;i<n;i++){const l=left?.[i]??0,r=right?.[i]??0;this.peak=Math.max(this.peak,Math.abs(l),Math.abs(r));this.sum+=l*l+r*r;}
  this.frames+=n;this.count+=n;if(this.count>=sampleRate)this.flush();return true;
 }
}
registerProcessor('jamloom-set-meter',SetMeter);
