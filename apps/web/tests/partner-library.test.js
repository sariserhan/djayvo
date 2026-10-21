import test from 'node:test';import assert from 'node:assert/strict';import {partnerFile} from '../practice-library.js';
test('partner loader bounds bytes, denies foreign URLs, and fails safely on incomplete responses',async()=>{
 const original=globalThis.fetch,track={url:'/api/aurowall/'+'a'.repeat(24),bytes:3,title:'House'};let cancelled=false;
 try{
  globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3]));assert.equal((await partnerFile(track)).size,3);
  await assert.rejects(partnerFile({...track,url:'https://example.com/private.mp3'}),/Invalid/);
  await assert.rejects(partnerFile({...track,bytes:101*1024*1024}),/Invalid/);
  globalThis.fetch=async()=>new Response(new Uint8Array([1,2]));await assert.rejects(partnerFile(track),/Incomplete/);
  globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}}));await assert.rejects(partnerFile(track),/size changed/);assert.equal(cancelled,true);
  globalThis.fetch=async()=>new Response(null,{status:503});await assert.rejects(partnerFile(track),/unavailable/);
 }finally{globalThis.fetch=original;}
});
