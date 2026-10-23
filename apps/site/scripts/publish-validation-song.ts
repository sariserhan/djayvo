import {songDurations,MAX_SONG_BYTES} from '../lib/song-duration';
import './env';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,mkdir,rm,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {r2AudioStore} from '../lib/audio-store';
import {musicAudioKey} from '../lib/music-storage';
import {validateWav} from '../lib/audio-validation';
import type {ValidationSong} from '../lib/music-validation';

const root=resolve('../..'),argument=process.argv.indexOf('--entry');
assert(argument>=0,'Pass the explicitly authorized test-song entry');
const entry=JSON.parse(await readFile(process.argv[argument+1],'utf8'));
assert.equal(entry.publicationConsent,true);
assert(['music-dna','improvise'].includes(entry.product));
assert(['passed','style-mismatch','not-checked'].includes(entry.check));
for(const field of ['title','language','direction'])assert(typeof entry[field]==='string'&&entry[field].length>0&&entry[field].length<=120&&!/[\x00-\x1f]/.test(entry[field]));
const path=await realpath(resolve(root,entry.audio));assert(path.startsWith(root+sep)&&path.endsWith('.wav'));
const data=await readFile(path),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),sha=hash(data);
assert.equal(sha,entry.audioSha256);
const duration=validateWav(data,data.length,sha,MAX_SONG_BYTES);const bounds=songDurations[entry.product as keyof typeof songDurations];assert(duration>=bounds.min*1000&&duration<=bounds.max*1000);
const song:ValidationSong={id:sha.slice(0,32),title:entry.title,language:entry.language,direction:entry.direction,product:entry.product,audioSha256:sha,audioBytes:data.length,check:entry.check,createdAt:new Date().toISOString()};
const manifestPath=resolve(root,'assets/manifests/music-validation.json'),lock=resolve(root,'renders/.validation-publication-lock');
await mkdir(lock);
try{
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));assert.equal(manifest.version,1);assert(Array.isArray(manifest.songs));
 const existing=manifest.songs.find((row:ValidationSong)=>row.id===song.id);if(existing)assert.equal(existing.audioSha256,sha);
 const store=r2AudioStore(),key=musicAudioKey(song.product,'public',song.id,sha);let present=false;
 try{assert.equal(hash(await store.get(key,data.length)),sha);present=true;}catch(error){if((error as {name?:string}).name!=='NoSuchKey')throw error;}
 if(!present){
  const response=await fetch(await store.uploadURL(key,data.length,180),{method:'PUT',headers:{'Content-Type':'audio/wav'},body:new Uint8Array(data),signal:AbortSignal.timeout(120000)});
  assert.equal(response.status,200);await response.arrayBuffer();
 }
 const url=await store.playbackURL(key),response=await fetch(url,{signal:AbortSignal.timeout(120000)});
 assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),sha);
 assert.equal(response.headers.get('x-amz-expiration'),null);
 const range=await fetch(url,{headers:{Range:'bytes=0-43'},signal:AbortSignal.timeout(15000)});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,44);
 if(!existing){manifest.songs.push(song);await writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2)+'\n');await rename(manifestPath+'.tmp',manifestPath);}
 console.log(JSON.stringify({status:'PASS',id:song.id,sha256:sha,bytes:data.length,product:song.product,check:song.check,alreadyListed:Boolean(existing)}));
}finally{await rm(lock,{recursive:true});}
