// shortcut: fixed energy endpoint; add calibrated VAD when device/noise trials justify it.
export class PhraseWindow {
  constructor(rate, buffer = new Float32Array(rate * 5)) {
    if (!Number.isInteger(rate) || rate < 8000 || rate > 192000 || buffer.length !== rate * 5) throw Error('Invalid phrase buffer');
    this.rate=rate;this.buffer=buffer;this.count=0;this.quiet=0;this.done=false;
  }
  push(input) {
    if(this.done||!input)return 0;
    for(let i=0;i<input.length;i++){
      const value=Number.isFinite(input[i])?Math.max(-1,Math.min(1,input[i])):0;
      if(!this.count&&Math.abs(value)<.015)continue;
      this.buffer[this.count++]=value;
      this.quiet=Math.abs(value)<.015?this.quiet+1:0;
      if(this.count===this.buffer.length||(this.count>=this.rate*2&&this.quiet>=this.rate/2)){
        this.done=true;return this.count;
      }
    }
    return 0;
  }
}
