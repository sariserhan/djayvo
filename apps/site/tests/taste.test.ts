import test from 'node:test';import assert from 'node:assert/strict';
import {emptyTaste,validateTaste,tasteBrief,tasteRender,applySongPreferences,type Taste} from '../lib/taste';
test('taste derives explicit dimensions, never audio attributes from titles',()=>{
 const p=validateTaste({...emptyTaste,references:['Any artist — Any song']});const brief=tasteBrief(p);
 assert.equal(brief.tempo_bpm,110);assert.equal(brief.origin,'explicit_user_preferences');assert.equal(brief.audio_generated,false);
 assert.equal(brief.proposals.length,3);assert.equal(new Set(brief.proposals.map(p=>p.focus)).size,3);
 assert.ok(brief.unknown.includes('reference melody'));assert.equal(brief.training_opt_in,false);
 for(const patch of [{tempo:0},{novelty:101},{instruments:['unknown']},{energy:'loud'},{references:['x'.repeat(161)]},{version:2},{instruments:[]}])assert.throws(()=>validateTaste({...p,...patch}));
});
test('local composer receives only explicit musical dimensions and bounded requests',()=>{
 const p={...emptyTaste,references:['Private song note'],instruments:['piano','bass','drums','voice']};
 assert.deepEqual(tasteRender(p,42,60,1),{seed:42,tempo:110,energy:1,instruments:13,novelty:50,seconds:60,direction:1});
 assert.throws(()=>tasteRender({...p,instruments:['voice']},42,30,0),/recording/);
 for(const args of [[-1,30,0],[1,181,0],[1,30,3],[NaN,30,0],[1,29,0]])assert.throws(()=>tasteRender(p,args[0],args[1],args[2]));
});

test('catalogue choices preserve licensed identities and expose weighted metadata evidence without inferred audio',async()=>{
 const {tasteCatalogue,inferCatalogueTaste}=await import('../lib/taste-catalogue');
 const id=tasteCatalogue[0].id,profile=validateTaste({...emptyTaste,catalogue:[{id,rating:'love',weight:4}]});
 assert.equal(profile.catalogue?.[0].id,id);const result=inferCatalogueTaste(profile.catalogue!);assert.equal(result.genres[0].score,8);assert.equal(result.evidence[0].sha256,tasteCatalogue[0].sha256);assert.equal(result.confidence,'limited_metadata');assert.ok(result.unknown.includes('tempo'));
 assert.equal(tasteBrief(profile).catalogue.evidence.length,1);assert.equal(tasteRender(profile,42,30,0).tempo,emptyTaste.tempo);
 for(const choices of [[{id:'unknown',rating:'love',weight:1}],[{id,rating:'love',weight:0}],[{id,rating:'copy',weight:1}],[{id,rating:'like',weight:1},{id,rating:'love',weight:2}]])assert.throws(()=>validateTaste({...emptyTaste,catalogue:choices}));
 assert.equal(inferCatalogueTaste([{id,rating:'avoid',weight:5}]).genres[0].score,-5);
});


test('confirmed favorites change composition controls, blend by importance and keep unspecified settings',()=>{
 const profile:Taste={...emptyTaste,references:['Soft piano song','Fast groove song'],songPreferences:[
  {reference:'Soft piano song',aspects:['gentle','slow','piano','melody'],weight:3},
  {reference:'Fast groove song',aspects:['intense','fast','drums','groove'],weight:1}
 ]};
 const applied=applySongPreferences(profile);
 assert.equal(applied.tempo,95);assert.equal(applied.energy,'balanced');assert.equal(applied.direction,1);
 assert.deepEqual(applied.instruments,['piano','drums']);assert.equal(applied.novelty,profile.novelty);
 assert.deepEqual(tasteRender(applied,42,30,applied.direction!),{seed:42,tempo:95,energy:1,instruments:9,novelty:50,seconds:30,direction:1});
 assert.deepEqual(validateTaste(JSON.parse(JSON.stringify(applied))),applied);
 assert.deepEqual(tasteBrief(applied).song_preferences,profile.songPreferences);
 const tied=applySongPreferences({...profile,direction:2,songPreferences:profile.songPreferences!.map(c=>({...c,weight:1}))});
 assert.equal(tied.direction,2);assert.equal(tied.tempo,110);
 assert.deepEqual(applySongPreferences({...emptyTaste,references:['Unknown title'],direction:2}),{...emptyTaste,references:['Unknown title'],direction:2});
 const instrumentsOnly=applySongPreferences({...profile,songPreferences:[{reference:'Soft piano song',aspects:['guitar'],weight:5}]});
 assert.equal(instrumentsOnly.tempo,110);assert.equal(instrumentsOnly.energy,'balanced');assert.deepEqual(instrumentsOnly.instruments,['guitar']);
});

test('song annotations reject malformed, duplicate, unbound and unsupported choices at the profile boundary',()=>{
 const song={reference:'Song',aspects:['piano'],weight:3};
 for(const songPreferences of [null,{},[null],[{...song,reference:'Missing'}],[song,song],[{...song,weight:0}],[{...song,weight:6}],
  [{...song,weight:1.5}],[{...song,aspects:['piano','piano']}],[{...song,aspects:['voice']}],[{...song,aspects:['__proto__']}],
  [{...song,aspects:'piano'}],[{...song,aspects:[{toString:null}]}],Array(21).fill(song)])assert.throws(()=>validateTaste({...emptyTaste,references:['Song'],songPreferences}),/Invalid preference profile/);
 for(const direction of [null,NaN,-1,3,1.2,'1'])assert.throws(()=>validateTaste({...emptyTaste,direction}),/Invalid preference profile/);
 assert.equal(validateTaste({...emptyTaste,references:[' Song '],songPreferences:[song]}).songPreferences?.[0].reference,'Song');
});
