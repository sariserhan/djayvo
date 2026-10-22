import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicSearch,MusicSearchBusy,musicSearchResults} from '../lib/music-search';
import {POST} from '../app/api/music-search/route';
const results=[{wrapperType:'artist',artistName:'Beyoncé'},{wrapperType:'track',kind:'song',artistName:'Beyoncé',trackName:'Halo',collectionName:'I AM…SASHA FIERCE',previewUrl:'https://example.com/audio',artworkUrl100:'https://example.com/art'}];

test('music search exposes bounded artist/song names, not audio or artwork',()=>{
 const parsed=musicSearchResults({results:[...results,...results,null,{wrapperType:'track',kind:'music-video',artistName:'Other',trackName:'Video'},{wrapperType:'artist',artistName:'x'.repeat(161)},{wrapperType:'artist',artistName:'bad\nname'}]});
 assert.deepEqual(parsed,[{reference:'Beyoncé',kind:'Artist',detail:'iTunes catalogue'},{reference:'Halo — Beyoncé',kind:'Track',detail:'I AM…SASHA FIERCE · iTunes'}]);
 assert.throws(()=>musicSearchResults({error:'bad'}));assert.deepEqual(musicSearchResults({results:[]}),[]);
 assert.ok(musicSearchResults({results:Array.from({length:100},(_,i)=>({...results[i%2],artistName:String(i)}))}).length<=12);
 const enriched=musicSearchResults({results:[{...results[0],artistId:12,primaryGenreName:'R&B/Soul'}]});
 assert.deepEqual(enriched[0].metadata,{reference:'Beyoncé',genre:'R&B/Soul',source:'itunes',id:12});
});

test('requests use the fixed music endpoint, coalesce and cache, and expire',async()=>{
 let calls=0,now=0;
 const search=new MusicSearch(async(input,init)=>{
  calls++;const url=new URL(String(input));assert.equal(url.origin+url.pathname,'https://itunes.apple.com/search');
  assert.equal(url.searchParams.get('term'),'bey');assert.equal(url.searchParams.get('entity'),'musicArtist,song');
  assert.equal(url.searchParams.get('country'),'US');assert.equal(init?.cache,'no-store');assert.equal(init?.redirect,'error');assert.ok(init?.signal);
  return Response.json({results});
 },()=>now);
 const [a,b]=await Promise.all([search.search(' BEY '),search.search('bey')]);assert.deepEqual(a,b);assert.equal(calls,1);
 await search.search('bey');assert.equal(calls,1);now=3_600_001;await search.search('bey');assert.equal(calls,2);
 assert.deepEqual(await search.search('b'),[]);assert.equal(calls,2);
 await assert.rejects(search.search('x'.repeat(161)));await assert.rejects(search.search('bad\nquery'));
});

test('provider failures do not poison the cache or pending requests',async()=>{
 for(const fail of [()=>new Response('',{status:503}),()=>Response.json({unexpected:true}),()=>{throw new DOMException('Timed out','TimeoutError');}]){
  let calls=0;const search=new MusicSearch(async()=>++calls===1?fail():Response.json({results}));
  await assert.rejects(search.search('bey'));assert.equal((await search.search('bey'))[0].reference,'Beyoncé');assert.equal(calls,2);
 }
 const limited=new MusicSearch(async()=>new Response('',{status:429}));await assert.rejects(limited.search('bey'),MusicSearchBusy);
});

test('uncached requests respect the twenty-per-minute budget, including concurrent requests',async()=>{
 let now=0,calls=0;const search=new MusicSearch(async()=>{calls++;return Response.json({results});},()=>now);
 await Promise.all(Array.from({length:20},(_,i)=>search.search(`name ${i}`)));
 await assert.rejects(search.search('one more'),MusicSearchBusy);assert.equal(calls,20);
 await search.search('name 0');assert.equal(calls,20);now=60_001;await search.search('one more');assert.equal(calls,21);
});

test('search route rejects malformed, oversized and cross-site requests without provider calls',async()=>{
 const request=(body:string,headers:Record<string,string>={})=>new Request('https://jamloom.com/api/music-search',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
 for(const body of ['null','{}','bad',JSON.stringify({query:3}),JSON.stringify({query:'x'.repeat(161)}),JSON.stringify({query:'bad\nquery'})])assert.equal((await POST(request(body))).status,400);
 assert.equal((await POST(request('x'.repeat(17000)))).status,413);
 assert.equal((await POST(request('{"query":"bey"}',{origin:'https://other.example'}))).status,403);
 assert.equal((await POST(request('{"query":"bey"}',{origin:'not a URL'}))).status,403);
 assert.equal((await POST(request('{"query":"bey"}',{'sec-fetch-site':'cross-site'}))).status,403);
 const response=await POST(request('{"query":"b"}',{origin:'https://jamloom.com'}));assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(await response.json(),{suggestions:[]});
 const proxied=await POST(new Request('http://localhost:4247/api/music-search',{method:'POST',headers:{origin:'http://127.0.0.1:4247',host:'127.0.0.1:4247'},body:'{"query":"b"}'}));assert.equal(proxied.status,200);
});
