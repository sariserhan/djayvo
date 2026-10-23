import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubePlaylist,youtubeItems,PlaylistImport} from '../lib/playlist-import';
const link='https://www.youtube.com/playlist?list=PL1234567890';
const fixture={items:[{snippet:{title:'Track — Artist',resourceId:{videoId:'abcdefghijk'}}},{snippet:{title:'Private video',resourceId:{videoId:'12345678901'}}},{snippet:{title:'Duplicate',resourceId:{videoId:'abcdefghijk'}}}],nextPageToken:'next'};
test('playlist URLs never become arbitrary fetch targets; malformed/unavailable entries are omitted',()=>{
 assert.equal(youtubePlaylist(link),'PL1234567890');
 for(const value of ['http://youtube.com/playlist?list=PL1234567890','https://youtube.com.evil.test/playlist?list=PL1234567890','https://a@youtube.com/playlist?list=PL1234567890','https://youtube.com:8443/playlist?list=PL1234567890','https://localhost/playlist?list=PL1234567890','https://youtu.be/abcdefghijk',null])assert.throws(()=>youtubePlaylist(value));
 assert.deepEqual(youtubeItems(fixture),{items:[{title:'Track — Artist',url:'https://www.youtube.com/watch?v=abcdefghijk'}],more:true,next:'next',skipped:2});
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
 assert.equal(exactPlaylistMatch('Beyoncé - Halo',[song,{...song}]),song);
 assert.equal(exactPlaylistMatch('Beyoncé - Halo',[song,{...song,metadata:{...song.metadata,genre:'Rock'}}]),undefined);
 assert.equal(exactPlaylistMatch('Beyoncé - Halo',[{...song,metadata:undefined}]),undefined);
});

test('playlist continuation is passed to the fixed YouTube endpoint and bounded',async()=>{
 const service=new PlaylistImport(()=>'secret',async(url)=>{const u=new URL(String(url));assert.equal(u.searchParams.get('pageToken'),'page-2');return Response.json({items:[]});});
 assert.deepEqual(await service.load(link,'page-2'),{items:[],more:false,next:null,skipped:0,url:link});
 await assert.rejects(service.load(link,'x'.repeat(2049)),/Invalid playlist page/);
 assert.throws(()=>youtubeItems({items:[],nextPageToken:{bad:true}}),/next page/);
});

test('whole playlist covers late genre majority, retries quota, and keeps unmatched entries explicit',async()=>{
 const {playlistTaste}=await import('../lib/playlist-taste');
 const {emptyTaste,validateTaste}=await import('../lib/taste');
 const {songInput}=await import('../lib/dna-song');
 const {musicDirection}=await import('../lib/taste-direction');
 let searches=0,pages=0,waits=0;const checked:string[]=[];
 const request:typeof fetch=async(path,options)=>{
  const body=JSON.parse(String(options?.body));
  if(path==='/api/playlist-import'){
   const offset=body.pageToken?50:0;pages++;assert.equal(body.pageToken,offset?'next':null);
   return Response.json({items:Array.from({length:offset?25:50},(_,j)=>({title:`Song ${j+offset} — Artist`,url:`https://www.youtube.com/watch?v=${String(j+offset).padStart(11,'0')}`})),next:offset?null:'next',skipped:offset?2:0});
  }
  if(searches++===20)return Response.json({error:'wait'},{status:429,headers:{'Retry-After':'1'}});
  checked.push(body.query);const i=Number(body.query.match(/Song (\d+)/)[1]);
  const reference=`Song ${i} — Artist`;
  return Response.json({suggestions:i===74?[]:[{reference,kind:'Track',metadata:{reference,genre:i<20?'Pop':'Metal',source:'itunes',id:i+1}}]});
 };
 const result=await playlistTaste(link,new AbortController().signal,()=>{},request,async()=>{waits++;});
 assert.equal(pages,2);assert.equal(waits,1);assert.equal(checked.length,76);assert.equal(result.songs.length,74);assert.equal(result.unmatched.length,1);assert.equal(result.skipped,2);
 const profile=validateTaste({...emptyTaste,references:result.songs.map(s=>s.reference),referenceMetadata:result.songs.map(s=>s.metadata!)});
 const payload=songInput(JSON.parse(JSON.stringify(profile)));assert.equal(payload.references.length,74);assert.equal(musicDirection(payload)?.id,'heavy-rock');assert.equal(musicDirection(payload)?.total,74);
});

test('failed, cyclic and cancelled whole-playlist reads never return a partial taste',async()=>{
 const {playlistTaste}=await import('../lib/playlist-taste');
 await assert.rejects(playlistTaste(link,new AbortController().signal,()=>{},async()=>Response.json({items:[],next:'same'})),/completely/);
 let calls=0;
 await assert.rejects(playlistTaste(link,new AbortController().signal,()=>{},async()=>++calls===1?Response.json({items:[],next:'second'}):Response.json({error:'Unavailable'},{status:503})),/Unavailable/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(playlistTaste(link,controller.signal,()=>{},async()=>{throw Error('Must not fetch');}),{name:'AbortError'});
});

test('large Unicode profiles round-trip without truncation and reject oversized lists',async()=>{
 const {emptyTaste,validateTaste}=await import('../lib/taste');
 const {songInput}=await import('../lib/dna-song');
 const references=Array.from({length:5000},(_,i)=>`Günden Güne ${i} — Sanatçı`);
 const profile=validateTaste({...emptyTaste,references,referenceMetadata:references.map(reference=>({reference,genre:'Rock',source:'itunes'}))});
 assert.equal(songInput(JSON.parse(JSON.stringify(profile))).references.length,5000);
 assert.throws(()=>validateTaste({...profile,references:[...references,'Too many']}),/Invalid/);
 assert.throws(()=>validateTaste({...profile,extra:'x'.repeat(4*1024*1024)}),/Invalid/);
});

test('official-video labels in different languages are removed, but live/remix identity is retained',async()=>{
 const {playlistQuery}=await import('../lib/playlist-match');
 for(const tag of ['(Video Oficial)','( Video Lyric )','[Resmi Klip]','(Clip Officiel)','(Официальный клип)'])assert.equal(playlistQuery('Artist - Song '+tag),'Artist - Song');
 assert.equal(playlistQuery('Artist - Song (Live Acoustic)'),'Artist - Song (Live Acoustic)');
});

test('matching removes video formatting and VEVO channel suffixes without stripping musical versions',async()=>{
 const {playlistQuery,playlistSearchQuery}=await import('../lib/playlist-match');
 assert.equal(playlistSearchQuery('Halo','BeyoncéVEVO'),'Beyoncé - Halo');
 assert.equal(playlistQuery('Artist - Song (Visualizer)'),'Artist - Song');
 assert.equal(playlistQuery('Artist - Song Official Performance Video'),'Artist - Song');
 for(const version of ['(Remix)','(Live)','(Acoustic)','(Sped Up)','(Instrumental)','(From The Vault)'])assert.equal(playlistQuery('Artist - Song '+version),'Artist - Song '+version);
});

test('omitted guest credits only match an unambiguous exact title and primary artist',async()=>{
 const {exactPlaylistMatch}=await import('../lib/playlist-match');
 const song=(reference:string)=>({reference,kind:'Track' as const,detail:'iTunes',metadata:{reference,genre:'Hip-Hop/Rap',source:'itunes' as const,id:1}});
 const original=song('Everybody (feat. Lil Uzi Vert) — Nicki Minaj');
 assert.equal(exactPlaylistMatch('Nicki Minaj - Everybody',[original]),original);
 assert.equal(exactPlaylistMatch('Nicki Minaj - Everybody',[original,song('Everybody (feat. Other) — Nicki Minaj')]),undefined);
 assert.equal(exactPlaylistMatch('Nicki Minaj - Everybody (Live)',[original]),undefined);
 assert.equal(exactPlaylistMatch('Other Artist - Everybody',[original]),undefined);
 assert.equal(exactPlaylistMatch('Everybody',[original]),undefined);
});

test('equivalent catalogue genre labels and bracketed guest-credit wording preserve song identity',async()=>{
 const {exactPlaylistMatch}=await import('../lib/playlist-match');
 const song={reference:'Song (with Guest) — Artist',kind:'Track' as const,detail:'iTunes',metadata:{reference:'Song (with Guest) — Artist',genre:'Hip-Hop/Rap',source:'itunes' as const,id:1}};
 assert.equal(exactPlaylistMatch('Artist - Song (feat. Guest)',[song,{...song,metadata:{...song.metadata,genre:'Rap'}}]),song);
 assert.equal(exactPlaylistMatch('Artist - Song (feat. Other Guest)',[song]),undefined);
});

test('a title-only fallback still validates the original full song identity',async()=>{
 const {playlistLookupQueries,exactPlaylistMatch}=await import('../lib/playlist-match');
 assert.deepEqual(playlistLookupQueries('BELLAKEO (Video Oficial) - Peso Pluma, Anitta','Peso Pluma'),['BELLAKEO - Peso Pluma, Anitta','BELLAKEO']);
 assert.deepEqual(playlistLookupQueries('Artist - Song (Live)','ArtistVEVO'),['Artist - Song (Live)','Song (Live)']);
 const song={reference:'Song — Different Artist',kind:'Track' as const,detail:'iTunes',metadata:{reference:'Song — Different Artist',genre:'Pop',source:'itunes' as const,id:1}};
 assert.equal(exactPlaylistMatch('Artist - Song',[song]),undefined);
});
