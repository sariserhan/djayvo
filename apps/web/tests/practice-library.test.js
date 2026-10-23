import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {practiceFile,isPracticeFile} from '../practice-library.js';
const folder = new URL('../practice-audio/', import.meta.url);
const {tracks} = JSON.parse(await readFile(new URL('manifest.json',folder)));
test('practice catalogue contains ten complete, pinned CC0 recordings', async () => {
  assert.equal(tracks.length,10);
  assert.equal(new Set(tracks.map(t=>t.id)).size,10);
  assert.equal(new Set(tracks.map(t=>t.source_sha256)).size,10);
  assert.ok(tracks.reduce((sum,t)=>sum+t.bytes,0)<32*1024*1024);
  for (const track of tracks) {
    const bytes=await readFile(new URL(track.url.slice('./practice-audio/'.length),folder));
    assert.equal(bytes.length,track.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),track.sha256);
    assert.equal(track.license,'CC0-1.0');assert.ok(track.artist);assert.ok(track.source_page.startsWith('https://opengameart.org/content/'));
    assert.ok(track.seconds>60);assert.ok(Number(track.measurements.input_tp)<-1);assert.equal(track.bpm,null);
  }
});
test('practice loader rejects truncation, excess bytes, tampering and external URLs', async t => {
  const track=tracks[0],bytes=await readFile(new URL('funked-up.mp3',folder));
  const fetch=t.mock.method(globalThis,'fetch',async()=>new Response(bytes));
  const file=await practiceFile(track);assert.equal(file.size,track.bytes);assert.equal(file.type,'audio/mpeg');assert.equal(isPracticeFile(file),true);assert.equal(isPracticeFile(new File([bytes],file.name,{type:file.type})),false);
  for(const [body,pattern] of [[bytes.subarray(0,-1),/Incomplete/],[new Uint8Array(bytes.length+1),/size mismatch/],[new Uint8Array(bytes.length),/checksum mismatch/]]) {
    fetch.mock.mockImplementation(async()=>new Response(body));await assert.rejects(()=>practiceFile(track),pattern);
  }
  await assert.rejects(()=>practiceFile({...track,url:'https://example.com/audio.mp3'}),/Invalid/);
  fetch.mock.mockImplementation(async()=>new Response('',{status:404}));await assert.rejects(()=>practiceFile(track),/unavailable/);
  const signal=AbortSignal.abort();fetch.mock.mockImplementation(async(_,options)=>{assert.equal(options.signal,signal);throw signal.reason;});
  await assert.rejects(()=>practiceFile(track,signal),{name:'AbortError'});
});
