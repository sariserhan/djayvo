import manifest from '../../../assets/manifests/music-validation.json';
export type ValidationSong={id:string;title:string;language:string;direction:string;product:'music-dna'|'improvise';audioSha256:string;audioBytes:number;check:'passed'|'style-mismatch'|'not-checked';createdAt:string};
export const validationSongs=manifest.songs as ValidationSong[];
