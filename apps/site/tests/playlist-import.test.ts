import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubePlaylist,youtubeItems,PlaylistImport} from '../lib/playlist-import';
const link='https://www.youtube.com/playlist?list=PL1234567890';
const fixture={items:[{snippet:{title:'Track — Artist',resourceId:{videoId:'abcdefghijk'}}},{snippet:{title:'Private video',resourceId:{videoId:'12345678901'}}},{snippet:{title:'Duplicate',resourceId:{videoId:'abcdefghijk'}}}],nextPageToken:'next'};
test('playlist URLs never become arbitrary fetch targets; malformed/unavailable entries are omitted',()=>{
 assert.equal(youtubePlaylist(link),'PL1234567890');
 for(const value of ['http://youtube.com/playlist?list=PL1234567890','https://youtube.com.evil.test/playlist?list=PL1234567890','https://a@youtube.com/playlist?list=PL1234567890','https://youtube.com:8443/playlist?list=PL1234567890','https://localhost/playlist?list=PL1234567890','https://youtu.be/abcdefghijk',null])assert.throws(()=>youtubePlaylist(value));
 assert.deepEqual(youtubeItems(fixture),{items:[{title:'Track — Artist',url:'https://www.youtube.com/watch?v=abcdefghijk'}],more:true});
});
test('playlist connection is bounded, server credential only, no cache, and fails closed',async()=>{
 let calls=0;
 const request:typeof fetch=async(url,options)=>{calls++;const target=new URL(String(url));assert.equal(target.origin,'https://www.googleapis.com');assert.equal(target.searchParams.get('key'),'server-secret');assert.equal(options?.redirect,'error');assert.equal(options?.cache,'no-store');return Response.json(fixture);};
 const service=new PlaylistImport(()=>'server-secret',request,()=>0);
 for(let i=0;i<10;i++)assert.equal((await service.load(link)).items.length,1);
 await assert.rejects(service.load(link),/wait a minute/);assert.equal(calls,10);
 await assert.rejects(new PlaylistImport(()=>undefined,request).load(link),/not available/);assert.equal(calls,10);
 await assert.rejects(new PlaylistImport(()=>'secret',async()=>new Response('secret provider detail',{status:403})).load(link),/YouTube could not load/);
 await assert.rejects(new PlaylistImport(()=>'secret',async()=>new Response('',{status:404})).load(link),/private or unavailable/);
});

test('bulk matching requires one exact catalogue song and never guesses from a partial title',async()=>{
 const {exactPlaylistMatch,playlistQuery}=await import('../lib/playlist-match');
 const song={reference:'Halo — Beyoncé',kind:'Track' as const,detail:'iTunes',metadata:{reference:'Halo — Beyoncé',genre:'Pop',source:'itunes' as const,id:1}};
 assert.equal(playlistQuery('Beyoncé - Halo (Official Video)'),'Beyoncé - Halo');
 assert.equal(exactPlaylistMatch('Beyoncé - Halo (Official Video)',[song]),song);
 assert.equal(exactPlaylistMatch('Halo',[song]),undefined);
 assert.equal(exactPlaylistMatch('Beyoncé - Halo live',[song]),undefined);
 assert.equal(exactPlaylistMatch('Beyoncé - Halo',[song,{...song}]),undefined);
 assert.equal(exactPlaylistMatch('Beyoncé - Halo',[{...song,metadata:undefined}]),undefined);
});
