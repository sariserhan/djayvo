import test from 'node:test';import assert from 'node:assert/strict';
import {emptyTaste,validateTaste,tasteRender} from '../lib/taste';
import {automaticTaste,favoriteList,resolveFavoriteMetadata} from '../lib/taste-auto';
import {tasteCatalogue} from '../lib/taste-catalogue';
const profile=(genres:string[])=>({...emptyTaste,references:genres.map((_,i)=>`Song ${i}`),referenceMetadata:genres.map((genre,i)=>({reference:`Song ${i}`,genre,source:'itunes' as const,id:i+1}))});
test('favorite genres alone change real composer controls without manual musical choices',()=>{
 const classical=automaticTaste(profile(['Classical'])),dance=automaticTaste(profile(['Dance']));
 assert.equal(classical.used,1);assert.equal(classical.profile.tempo,84);assert.deepEqual(classical.profile.instruments,['piano']);
 assert.equal(dance.profile.tempo,128);assert.equal(dance.profile.energy,'intense');assert.ok(dance.profile.instruments.includes('synth'));
 assert.notDeepEqual(tasteRender(classical.profile,42,30,classical.profile.direction!),tasteRender(dance.profile,42,30,dance.profile.direction!));
 assert.equal(classical.confidence,'genre_based');assert.ok(classical.unknown.includes('reference groove'));
 const oldManual={...profile(['Classical']),tempo:180,energy:'intense' as const,instruments:['drums'],songPreferences:[{reference:'Song 0',aspects:['fast' as const,'drums' as const],weight:5}]};
 assert.equal(automaticTaste(oldManual).profile.tempo,84);assert.deepEqual(automaticTaste(oldManual).profile.instruments,['piano']);
 assert.deepEqual(automaticTaste(oldManual).profile.songPreferences,oldManual.songPreferences);
});
test('all favorites contribute equally, duplicates do not inflate taste and unknowns remain explicit',()=>{
 const mixed=automaticTaste(profile(['Classical','Dance','Dance']));assert.equal(mixed.profile.tempo,113);assert.equal(mixed.genres[0].name,'Dance');assert.equal(mixed.genres[0].count,2);
 const original=profile(['Classical']);const duplicate=automaticTaste({...original,references:['Song 0','SONG 0']});assert.equal(duplicate.total,1);assert.equal(duplicate.profile.tempo,84);
 const unknown=automaticTaste({...emptyTaste,references:['Fast loud piano']});assert.equal(unknown.used,0);assert.equal(unknown.confidence,'unresolved');assert.deepEqual(unknown.unresolved,['Fast loud piano']);assert.equal(unknown.profile.tempo,110);
 assert.equal(automaticTaste(profile(['Unclassified'])).unsupported.length,1);
});
test('legacy liked catalogue rows become favorites while avoid rows and annotations are preserved',()=>{
 const [a,b]=tasteCatalogue;const result=favoriteList({...emptyTaste,catalogue:[{id:a.id,rating:'love',weight:5},{id:b.id,rating:'avoid',weight:3}]});
 assert.deepEqual(result.references,[`${a.title} — ${a.artist}`]);assert.equal(result.referenceMetadata?.[0].genre,a.genre);assert.equal(result.catalogue?.length,2);
 assert.deepEqual(favoriteList(result),result);assert.ok(automaticTaste(result).used>0);
 assert.deepEqual(validateTaste(JSON.parse(JSON.stringify(result))),result);
});
test('metadata round trips and rejects unbound, duplicate, malformed and unbounded fields',()=>{
 const p=profile(['R&B/Soul']);assert.deepEqual(validateTaste(p),p);
 const m=p.referenceMetadata[0];
 for(const referenceMetadata of [null,{},[null],[m,m],[{...m,reference:'other'}],[{...m,genre:''}],[{...m,genre:'x'.repeat(81)}],[{...m,source:'guess'}],[{...m,id:-1}],[{...m,id:1.2}]])assert.throws(()=>validateTaste({...p,referenceMetadata}),/Invalid preference profile/);
});
test('legacy names resolve only exact metadata matches; unrelated search hits are not assigned',async()=>{
 const signal=new AbortController().signal;const requested:string[]=[];
 const result=await resolveFavoriteMetadata({...emptyTaste,references:['Halo — Beyoncé','Halo']},signal,async(_,init)=>{
  requested.push(JSON.parse(String(init?.body)).query);
  return Response.json({suggestions:[{reference:'Halo — Beyoncé',metadata:{reference:'Halo — Beyoncé',genre:'Pop',source:'itunes',id:1}}]});
 });
 assert.deepEqual(requested,['Halo Beyoncé','Halo']);assert.equal(result.referenceMetadata?.length,1);assert.equal(result.referenceMetadata?.[0].reference,'Halo — Beyoncé');
 const known=await resolveFavoriteMetadata(result,signal,async()=>Response.json({suggestions:[]}));assert.equal(known.referenceMetadata?.length,1);
});
test('lookup failure preserves favorites, cancellation aborts, malformed metadata is not retained',async()=>{
 const p={...emptyTaste,references:['One','Two']},controller=new AbortController();let calls=0;
 const result=await resolveFavoriteMetadata(p,controller.signal,async()=>{calls++;return new Response('',{status:429});});assert.equal(calls,1);assert.deepEqual(result.references,p.references);assert.deepEqual(result.referenceMetadata,[]);
 controller.abort();await assert.rejects(resolveFavoriteMetadata(p,controller.signal),{name:'AbortError'});
 const malformed=await resolveFavoriteMetadata(p,new AbortController().signal,async()=>Response.json({suggestions:[{reference:'One',metadata:{reference:'One',genre:'Pop',source:'wrong'}}]}));assert.deepEqual(malformed.referenceMetadata,[]);
});
