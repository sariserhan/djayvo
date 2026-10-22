import { createHash } from 'node:crypto';

export const MAX_AUDIO_BYTES = 11_520_044;
export const STRATEGIES = ['hiphop','reggae','experimental','club','funk','call_response','hybrid'] as const;
export const MOODS=['energetic','chill','playful','dark','uplifting'];
export function publicationInput(value: unknown) {
  const v=value as Record<string,unknown>;
  if(!v || typeof v!=='object' || v.consent!==true || Object.keys(v).some(k=>!['artist','description','mood','consent'].includes(k))) throw new AudioError('Explicit public-listening permission is required.');
  const fields:Record<string,string>={};
  for(const [key,max] of [['artist',80],['description',500],['mood',20]] as const) {
    const text=v[key];
    if(typeof text!=='string'||!text.trim()||text.length>max||(key==='description'?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/:/[\x00-\x1f\x7f]/).test(text)) throw new AudioError('Invalid text.');
    fields[key]=text.trim();
  }
  if(!MOODS.includes(fields.mood)) throw new AudioError('Invalid mood.');
  return {artist:fields.artist,description:fields.description,mood:fields.mood,consent:true};
}
const audioErrorBrand=Symbol.for('jamloom.audio.error');
export class AudioError extends Error {
  readonly [audioErrorBrand]=true;
  // Next route bundles can share services while loading distinct class constructors.
  static [Symbol.hasInstance](value:unknown) { return value instanceof Error && audioErrorBrand in value && value[audioErrorBrand]===true; }
  constructor(message: string, public status = 400) { super(message); }
}
export function uuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)) throw new AudioError('Invalid track identifier.');
}
export function saveInput(value: unknown) {
  const v = value as Record<string, unknown>;
  if (!v || typeof v !== 'object' || Object.keys(v).some(k => !['requestId','title','strategy','bytes','sha256','consent','visibility','publication'].includes(k))) throw new AudioError('Invalid save request.');
  if(v.visibility!==undefined && !['public','private'].includes(v.visibility as string)) throw new AudioError('Choose public or private.');
  if(v.visibility!=='public' && v.publication!==undefined) throw new AudioError('Private saves cannot request publication.');
  // Legacy clients never opted into public sharing.
  const publication=v.visibility==='public'?publicationInput(v.publication):null;
  uuid(v.requestId);
  if (v.consent !== true) throw new AudioError('Permission to save this mix is required.');
  if (typeof v.title !== 'string' || !v.title.trim() || v.title.length > 120 || /[\x00-\x1f\x7f]/.test(v.title)) throw new AudioError('Use a title of 1–120 characters.');
  if (!STRATEGIES.includes(v.strategy as typeof STRATEGIES[number])) throw new AudioError('Unsupported musical direction.');
  if (!Number.isInteger(v.bytes) || (v.bytes as number) < 2_880_044 || (v.bytes as number) > MAX_AUDIO_BYTES || ((v.bytes as number)-44)%4) throw new AudioError('Choose a 15–60 second Jamloom WAV mix.');
  if (typeof v.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.sha256)) throw new AudioError('Invalid audio checksum.');
  return { requestId: v.requestId, title: v.title.trim(), strategy: v.strategy as string, bytes: v.bytes as number, sha256: v.sha256, publication };
}
export function validateWav(data: Buffer, bytes: number, sha256: string) {
  if (data.length !== bytes || data.length > MAX_AUDIO_BYTES || data.length < 44 ||
    createHash('sha256').update(data).digest('hex') !== sha256) throw new AudioError('Uploaded audio does not match the selected file.');
  // Only the metadata-free format exported by Jamloom is accepted.
  if (data.toString('ascii',0,4) !== 'RIFF' || data.readUInt32LE(4) !== bytes-8 ||
    data.toString('ascii',8,16) !== 'WAVEfmt ' || data.readUInt32LE(16) !== 16 ||
    data.readUInt16LE(20) !== 1 || data.readUInt16LE(22) !== 2 || data.readUInt32LE(24) !== 48000 ||
    data.readUInt32LE(28) !== 192000 || data.readUInt16LE(32) !== 4 || data.readUInt16LE(34) !== 16 ||
    data.toString('ascii',36,40) !== 'data' || data.readUInt32LE(40) !== bytes-44 ||
    (bytes-44)%4 || bytes < 2_880_044) throw new AudioError('Choose an unmodified 15–60 second stereo 48 kHz PCM16 Jamloom WAV.');
  const sum = [0,0], squares = [0,0];
  for (let at=44; at<bytes; at+=2) {
    const sample=data.readInt16LE(at), channel=((at-44)/2)%2;
    if (sample===-32768 || sample===32767) throw new AudioError('Audio contains full-scale samples.');
    sum[channel]+=sample; squares[channel]+=sample*sample;
  }
  const frames=(bytes-44)/4;
  if (squares.every((s,i) => s/frames-(sum[i]/frames)**2 < 1)) throw new AudioError('Audio is silent or constant.');
  return Math.round(frames/48);
}

export async function readBody(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new AudioError('Missing upload.');
  const reader=body.getReader(), chunks: Uint8Array[]=[];
  let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      size+=value.byteLength;
      if (size>limit) { await reader.cancel(); throw new AudioError('Upload is too large.',413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
