import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {dnaFeedback} from '../lib/dna-feedback-api';import {personalFeedback,listenerDirectory} from '../lib/dna-feedback';
import {validateFeedback} from '../lib/dna-feedback-schema';import {validateTaste,emptyTaste} from '../lib/taste';import {musicDirection,favoriteKey} from '../lib/taste-direction';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex'),id='a'.repeat(32),base='http://127.0.0.1:4247/api/taste/feedback?id='+id;
const request=(method:string,listener='1'.repeat(32),value?:unknown)=>new Request(base,{method,headers:{host:'127.0.0.1:4247','X-Jamloom-DNA':'1','X-Jamloom-Listener':listener,'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)});
const feedback={rating:'dislike',tags:['too_slow'],personalize:true,trainingConsent:false};
test('language and feedback require supported values and explicit consent',()=>{
 for(const code of ['es','ru','tr','ja','ar','auto'])assert.equal(validateTaste({...emptyTaste,vocalLanguage:code}).vocalLanguage,code);
 assert.throws(()=>validateTaste({...emptyTaste,vocalLanguage:'made-up'}));
 for(const invalid of [{...feedback,trainingConsent:'yes'},{...feedback,personalize:undefined},{...feedback,tags:['ignore rules']},{...feedback,tags:['too_slow','too_slow']},{...feedback,rating:'like'}])assert.throws(()=>validateFeedback(invalid));
 assert.notEqual(favoriteKey({references:['x'],referenceMetadata:[],vocalLanguage:'es'}),favoriteKey({references:['x'],referenceMetadata:[],vocalLanguage:'tr'}));
});
test('feedback is listener-isolated, consented, bound to a real checked song and withdrawable',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jamloom-feedback-')),old=process.env.JAMLOOM_DNA_SINGER_ROOT;process.env.JAMLOOM_DNA_SINGER_ROOT=root;
 try{
  const profile={references:['Fixture favorite'],referenceMetadata:[{reference:'Fixture favorite',genre:'Pop',source:'itunes' as const,id:1}],vocalLanguage:'es'},direction=musicDirection(profile);
  const work=join(root,'renders/music-dna-songs',id);await mkdir(join(work,'singer'),{recursive:true});
  const input=JSON.stringify({profile,direction,seed:1}),plan=JSON.stringify({schema:'jamloom-dna-song-1',direction,input_sha256:sha(input),musical_traits:{groove:'syncopated'},cases:[{vocal_language:'es',bpm:110}]}),audio=Buffer.alloc(100,1),receipt={plan_sha256:sha(plan),audio_sha256:sha(audio)};
  for(const [name,value] of Object.entries({'input.json':input,'plan.json':plan,'singer/complete.json':JSON.stringify(receipt),'status.json':JSON.stringify({state:'completed'}),'fit.json':JSON.stringify({...receipt,input_sha256:sha(input),accepted:true,target:'pop'})}))await writeFile(join(work,name),value);
  await writeFile(join(work,'singer/singer.wav'),audio);
  assert.equal((await dnaFeedback(request('POST','bad',feedback))).status,400);
  const saved=await dnaFeedback(request('POST',undefined,feedback));assert.equal(saved.status,200);assert.equal((await saved.json()).feedback.trainingConsent,false);
  assert.equal((await(await dnaFeedback(request('GET','2'.repeat(32)))).json()).feedback,null);
  assert.equal((await personalFeedback(root,request('GET'),'pop','es')).length,1);
  assert.equal((await personalFeedback(root,request('GET'),'rock','es')).length,0);
  assert.equal((await personalFeedback(root,request('GET'),'pop','tr')).length,0);
  assert.equal((await dnaFeedback(request('POST',undefined,{...feedback,trainingConsent:true}))).status,200);
  const stored=JSON.parse(await readFile(join(listenerDirectory(root,request('GET')),id+'.json'),'utf8'));assert.equal(stored.consentVersion,1);assert.equal(stored.trainingConsent,true);
  assert.equal((await dnaFeedback(request('DELETE'))).status,200);assert.deepEqual(await personalFeedback(root,request('GET'),'pop','es'),[]);
  assert.equal((await(await dnaFeedback(request('GET'))).json()).feedback,null);
  const allRequest=()=>new Request(base.split('?')[0],{method:'DELETE',headers:request('DELETE').headers});
  const concurrent=await Promise.all([dnaFeedback(request('POST',undefined,feedback)),dnaFeedback(allRequest())]);
  assert.deepEqual(concurrent.map(r=>r.status),[200,409]);
  assert.equal((await dnaFeedback(request('POST','2'.repeat(32),feedback))).status,200);
  assert.equal((await dnaFeedback(new Request(base.split('?')[0]+'?id=',{method:'DELETE',headers:request('DELETE').headers}))).status,400);
  assert.equal((await dnaFeedback(allRequest())).status,200);
  assert.equal((await(await dnaFeedback(request('GET'))).json()).feedback,null);
  assert.equal((await(await dnaFeedback(request('GET','2'.repeat(32)))).json()).feedback.rating,'dislike');
  await writeFile(join(work,'singer/singer.wav'),Buffer.alloc(100,2));assert.equal((await dnaFeedback(request('POST',undefined,feedback))).status,409);
 }finally{if(old===undefined)delete process.env.JAMLOOM_DNA_SINGER_ROOT;else process.env.JAMLOOM_DNA_SINGER_ROOT=old;await rm(root,{recursive:true,force:true});}
});
