import limits from '../../../assets/manifests/song-durations.json';
import {AudioError} from './audio-validation';
export const songDurations=limits;
export const MAX_SONG_BYTES=limits['music-dna'].max*192000+44;
export function savedSongDuration(product:keyof typeof limits,payload:Record<string,unknown>){
 const seconds=payload.duration_seconds??limits[product].legacy;
 if(typeof seconds!=='number'||!Number.isInteger(seconds)||seconds<limits[product].min||seconds>limits[product].max)throw new AudioError('Invalid song duration.',422);
 return seconds;
}
