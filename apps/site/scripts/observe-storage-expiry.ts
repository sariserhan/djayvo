import './env';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {r2AudioStore} from '../lib/audio-store';

// Keep one synthetic probe until the provider expires it; reruns only observe.
const path=new URL('../../../docs/evidence/project-completion-20261023/storage-expiry.json',import.meta.url);
assert.equal(process.env.R2_BUCKET,'jamloom-audio');
let receipt:{key:string;createdAt:string;expiresAt?:string;observations:{at:string;status:number}[]};
try{receipt=JSON.parse(await readFile(path,'utf8'));}
catch(error){
 if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
 assert(process.argv.includes('--create'),'Pass --create for the single synthetic expiry probe');
 receipt={key:`uploads/${randomUUID()}.wav`,createdAt:new Date().toISOString(),observations:[]};
 const wav=Buffer.alloc(46);wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);
 await writeFile(path,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 await r2AudioStore().put(receipt.key,wav);
}
assert.match(receipt.key,/^uploads\/[a-f0-9-]{36}\.wav$/);
const response=await fetch(await r2AudioStore().playbackURL(receipt.key),{headers:{Range:'bytes=0-45'},signal:AbortSignal.timeout(20000)});
assert([206,404].includes(response.status),`Unexpected storage status ${response.status}`);
if(response.status===206){
 assert.equal((await response.arrayBuffer()).byteLength,46);
 const expiry=response.headers.get('x-amz-expiration')??'';assert.match(expiry,/jamloom-temporary-uploads-1-day/);
 receipt.expiresAt=expiry;
}else{
 assert(receipt.observations.some(x=>x.status===206),'Must observe the uploaded probe before claiming deletion');
 await response.arrayBuffer();
}
receipt.observations.push({at:new Date().toISOString(),status:response.status});
await writeFile(path,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:response.status===404?'PASS: provider deletion observed':'PARTIAL: expiry configured; deletion not observed',...receipt}));
