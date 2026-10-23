export const musicProducts=['music-dna','improvise','dj-studio','live-dj','academy'] as const;
export type MusicProduct=typeof musicProducts[number];
export function musicAudioKey(product:MusicProduct,visibility:'public'|'private',id:string,sha256:string){
 if(!musicProducts.includes(product)||!['public','private'].includes(visibility)||!/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(id)||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Invalid music storage identity.');
 return `${product}/${visibility}/${id}/${sha256}.wav`;
}
export const masterAudioKey=(row:{track_id:string;storage_key?:string|null})=>row.storage_key??`masters/${row.track_id}.wav`;
