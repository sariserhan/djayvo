import reviews from '../../../assets/manifests/dna-style-reviews.json';
import manifest from '../../../assets/manifests/music-validation.json';
export type ValidationSong={id:string;title:string;language:string;direction:string;product:'music-dna'|'improvise';audioSha256:string;audioBytes:number;check:'owner-reviewed'|'passed'|'style-mismatch'|'not-checked';createdAt:string};
export const validationSongs:ValidationSong[]=(manifest.songs as ValidationSong[]).map(song=>({...song,check:reviews.reviews.some(r=>r.accepted&&r.audio_sha256===song.audioSha256&&r.target===song.direction)?'owner-reviewed':song.check as ValidationSong['check']}));
