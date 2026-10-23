import './env';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import examples from '../../../assets/manifests/dna-examples.json';
import {r2AudioStore} from '../lib/audio-store';
import {dnaSong} from '../lib/dna-song';
import {exampleAudioKey} from '../lib/dna-examples';

async function main(){
 const apply=process.argv.includes('--apply'),bucket=process.argv[process.argv.indexOf('--bucket')+1];
 assert(process.argv.includes('--bucket')&&bucket===process.env.R2_BUCKET,'Pass --bucket with the configured R2 bucket.');
 const root=resolve('../..'),store=r2AudioStore(),sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
 process.env.JAMLOOM_DNA_SINGER_ROOT=root;
 const rows=[];
 // Validate the entire allowlist before any upload; never scan in failed or private jobs.
 for(const song of examples.examples){
  const response=await dnaSong(new Request(`http://127.0.0.1/api/taste/song?id=${song.id}`));
  assert.equal(response.status,200);assert.equal((await response.json()).state,'completed');
  const data=await readFile(join(root,'renders/music-dna-songs',song.id,'singer/singer.wav'));
  assert.equal(data.length,song.audioBytes);assert.equal(sha(data),song.audioSha256);
  assert.equal(data.toString('ascii',0,4),'RIFF');
  const key=exampleAudioKey(song);let exists=false;
  try{const saved=await store.get(key,song.audioBytes);assert.equal(sha(saved),song.audioSha256);exists=true;}
  catch(error){if((error as {name:string}).name!=='NoSuchKey')throw error;}
  rows.push({song,key,exists});
 }
 const receipt={at:new Date().toISOString(),bucket,apply,songs:[] as object[]};
 for(const {song,key,exists} of rows){
  if(apply&&!exists){
   const data=await readFile(join(root,'renders/music-dna-songs',song.id,'singer/singer.wav'));
   const response=await fetch(await store.uploadURL(key,data.length,180),{method:'PUT',headers:{'Content-Type':'audio/wav'},body:new Uint8Array(data),signal:AbortSignal.timeout(120000)});
   assert.equal(response.status,200);await response.arrayBuffer();
  }
  if(apply){
   const url=await store.playbackURL(key),response=await fetch(url,{signal:AbortSignal.timeout(120000)});
   assert.equal(response.status,200);assert.equal(sha(Buffer.from(await response.arrayBuffer())),song.audioSha256);
   assert.equal(response.headers.get('x-amz-expiration'),null,'Examples must not have a temporary-upload expiry.');
   const range=await fetch(url,{headers:{Range:'bytes=0-43'},signal:AbortSignal.timeout(15000)});
   assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,44);
  }
  const row={id:song.id,title:song.title,key,bytes:song.audioBytes,sha256:song.audioSha256,status:apply?'PASS':exists?'PRESENT':'UPLOAD NEEDED'};
  receipt.songs.push(row);console.log(JSON.stringify(row));
 }
 const output=process.argv.indexOf('--report');if(output>=0)await writeFile(process.argv[output+1],JSON.stringify(receipt,null,2)+'\n');
}
main().catch(error=>{console.error(JSON.stringify({status:'FAIL',errorType:error instanceof assert.AssertionError?'assertion':(error as {name?:string}).name??'provider'}));process.exitCode=1;});
