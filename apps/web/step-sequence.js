import {validCommand} from './live-take.js';
export function validPattern(pattern){return pattern&&Number.isInteger(pattern.tempo)&&pattern.tempo>=40&&pattern.tempo<=240&&Array.isArray(pattern.notes)&&pattern.notes.length===16&&pattern.notes.every(n=>n===null||Number.isInteger(n)&&n>=21&&n<=108);}
export class StepSequence {
 constructor(rate,pattern,patch,velocity){
  if(!Number.isInteger(rate)||rate<32000||rate>192000||!validPattern(pattern)||!pattern.notes.some(n=>n!==null))throw Error('Choose notes and a tempo from 40–240 BPM.');
  this.events=pattern.notes.flatMap((pitch,i)=>{
   const note=pitch===null?null:{type:'note',id:0xffffff00+i,patch,pitch,velocity};if(note&&!validCommand(note))throw Error('A step is outside this instrument’s playable range.');
   return [note,pitch===null?null:{type:'off',id:0xffffff00+i}];
  });
  this.stepFrames=rate*60/pattern.tempo/4;this.event=0;this.frames=0;
 }
 // Each event is anchored to the absolute sample clock, including fractional tempos.
 run(frames,render,emit){
  let left=frames;
  while(left>0){const step=Math.floor(this.event/2),at=Math.round((step+(this.event%2?.8:0))*this.stepFrames);
   if(at<=this.frames){const command=this.events[this.event%32];if(command)emit(command);this.event++;continue;}
   const count=Math.min(left,at-this.frames);render(count);this.frames+=count;left-=count;
  }
 }
}
