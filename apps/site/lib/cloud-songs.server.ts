import 'server-only';
import {after} from 'next/server';
import {services} from './services';
import {r2AudioStore} from './audio-store';
import {DnaCommerce} from './dna-commerce';
import {CloudSongs} from './cloud-songs';
import {cloudSongConfig} from './cloud-song-config';
import {cloudSongAPI} from './cloud-song-api';
export function hostedSongs(product:'music-dna'|'improvise'){
 const settings=cloudSongConfig();if(!settings)return null;
 const {pool,config}=services();
 return new CloudSongs(new DnaCommerce(pool,config.secret,r2AudioStore(),{product,live:settings.live,budget:settings.budget}),settings);
}
export async function hostedSongRequest(request:Request,product:'music-dna'|'improvise'){
 const songs=hostedSongs(product);if(!songs)return null;
 const {auth}=services(),session=await auth.api.getSession({headers:request.headers});
 return cloudSongAPI(request,songs,session?.user.emailVerified?session.user.id:null,id=>{
  after(async()=>{try{await songs.tick(id);}catch{console.error('Song update pending; scheduled recovery will retry.');}});
 });
}
