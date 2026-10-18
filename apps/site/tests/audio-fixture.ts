import { createHash, randomUUID } from 'node:crypto';
export function audioFixture() {
  const data=Buffer.alloc(3840044);
  data.write('RIFF'); data.writeUInt32LE(data.length-8,4); data.write('WAVEfmt ',8); data.writeUInt32LE(16,16);
  data.writeUInt16LE(1,20); data.writeUInt16LE(2,22); data.writeUInt32LE(48000,24); data.writeUInt32LE(192000,28);
  data.writeUInt16LE(4,32); data.writeUInt16LE(16,34); data.write('data',36); data.writeUInt32LE(data.length-44,40);
  for(let at=44;at<data.length;at+=2) data.writeInt16LE(Math.round(2000*Math.sin((at-44)/4*2*Math.PI*220/48000)),at);
  return data;
}
export const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
export const input=(data:Buffer)=>({requestId:randomUUID(),title:'Private test mix',strategy:'funk',bytes:data.length,sha256:hash(data),consent:true});
