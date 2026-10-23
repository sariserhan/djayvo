import test from 'node:test';
import assert from 'node:assert/strict';
import {visitorPingEnabled} from '../lib/visitorping';
import {comingSoonResponse} from '../lib/coming-soon';
import {storedDnaSong} from '../lib/dna-stored-song';
import type {DnaContext} from '../lib/dna-commerce';
import {aurowallObject} from '../lib/aurowall';
import catalogue from '../../../assets/manifests/aurowall-public.json';

test('analytics loads on public domains only, including the coming-soon page',async()=>{
 for(const host of ['localhost','127.0.0.1','[::1]','preview.jamloom.com','jamloom.com.evil.test']){
  assert.equal(visitorPingEnabled(host),false);
  assert.ok(!(await comingSoonResponse(new Request(`http://${host}/`)).text()).includes('<script defer'));
 }
 for(const host of ['jamloom.com','www.jamloom.com']){
  assert.equal(visitorPingEnabled(host),true);
  assert.match(await comingSoonResponse(new Request(`https://${host}/`)).text(),/<script defer/);
 }
});
test('public Aurowall catalogue contains only reviewed music and direct public URLs',()=>{
 assert.equal(catalogue.tracks.length,72);
 assert.equal(new Set(catalogue.tracks.map(t=>t.id)).size,catalogue.tracks.length);
 for(const track of catalogue.tracks){
  const url=new URL(track.url);assert.equal(url.origin,'https://cdn.aurowall.com');assert.equal(url.search,'');assert.equal(url.hash,'');
  const original=aurowallObject({Key:decodeURIComponent(url.pathname.slice(1)),Size:track.bytes});
  assert.ok(original);assert.equal(original.id,track.id);assert.equal(original.title,track.title);
 }
});
test('song collections remain readable without a local renderer or enabled generation',async()=>{
 const base='https://www.jamloom.com/api/taste/song';
 for(const view of ['public','mine']){
  const response=await storedDnaSong(new Request(base+'?view='+view));assert.equal(response?.status,200);
  assert.deepEqual(await response!.json(),{songs:[],next:null,available:false,feedbackAvailable:false});
 }
 const calls:unknown[][]=[],rows=[{id:'a'.repeat(32),title:'Stored public song'}];
 const context={readOnly:true,owner:null,commerce:{product:'music-dna',list:async(...args:unknown[])=>{calls.push(args);return {songs:rows,next:null};}}} as unknown as DnaContext;
 const publicList=await storedDnaSong(new Request(base+'?view=public'),context);
 assert.deepEqual((await publicList!.json()).songs,rows);assert.deepEqual(calls,[[null,'public','']]);
 const mine=await storedDnaSong(new Request(base+'?view=mine'),context);assert.deepEqual(await mine!.json(),{songs:[],next:null,signIn:true});assert.equal(calls.length,1);
 assert.equal(await storedDnaSong(new Request(base,{method:'POST'})),null);
 const unknown=await storedDnaSong(new Request(base+'?view=unknown'),context);assert.equal(unknown?.status,400);
});
