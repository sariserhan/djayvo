/** Real local inference through the request handler and disposable TEST credit ledger. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {DnaCommerce} from '../lib/dna-commerce';
import {dnaSong} from '../lib/dna-song';
import {emptyTaste} from '../lib/taste';
import {localAudioStore} from '../lib/audio-store';
const root=resolve('../..'),output=resolve(process.argv[2]??'../../build-playlist-taste/local-request');
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(target.hostname,'127.0.0.1');
const admin=createPool(target.href),database='jamloom_dna_local_'+randomUUID().replaceAll('-','');
await admin.query(`CREATE DATABASE "${database}"`);target.pathname='/'+database;
const pool=createPool(target.href);await mkdir(output,{recursive:true});
process.env.JAMLOOM_DNA_SINGER_ROOT=root;process.env.JAMLOOM_VOCAL_IDENTITY_ENABLED='true';delete process.env.VERCEL;
const commerce=new DnaCommerce(pool,'local-inference-rehearsal-secret-'.repeat(3),localAudioStore(join(output,'storage')));
const refs=[['Enter Sandman — Metallica','Metal'],['Chop Suey! — System of a Down','Metal'],['Killing in the Name — Rage Against the Machine','Hard Rock']];
const profile={...emptyTaste,references:refs.map(r=>r[0]),referenceMetadata:refs.map(([reference,genre])=>({reference,genre,source:'itunes'})),vocalLanguage:'en'};
const id=randomUUID().replaceAll('-',''),base='http://127.0.0.1:4235/api/taste/song';
const request=(method:string,query='',body?:unknown)=>new Request(base+query,{method,headers:{host:'127.0.0.1:4235',origin:'http://127.0.0.1:4235','X-Jamloom-DNA':'1','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const phases:string[]=[];const started=Date.now();
try{
 await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['local-review','local-review@example.test']);
 await commerce.wallet.grant('local-review',{provider:'stripe_test',receipt:id,credits:20,netMicros:10_000_000});
 const context={commerce,owner:'local-review'};
 const quoted=await dnaSong(request('POST','',{action:'quote',profile,visibility:'private',publicConsent:false}),context);assert.equal(quoted.status,200);const quote=await quoted.json();
 const submitted=await dnaSong(request('POST','',{action:'submit',requestId:id,profile,visibility:'private',publicConsent:false,token:quote.token}),context);assert.equal(submitted.status,202,JSON.stringify(await submitted.json()));
 let value:any;
 while(Date.now()-started<960_000){
  const response=await dnaSong(request('GET',`?id=${id}`),context);assert.equal(response.status,200);value=await response.json();
  const phase=value.phase??value.state;if(phases.at(-1)!==phase){phases.push(phase);console.log(JSON.stringify({id,phase,seconds:(Date.now()-started)/1000}));}
  if(['completed','failed','cancelled','rejected'].includes(value.state))break;
  await new Promise(r=>setTimeout(r,2000));
 }
 const row=await commerce.row(id),balance=await commerce.wallet.balance('local-review');
 const report={id,seconds:(Date.now()-started)/1000,state:value?.state,phases,balance,quotedCredits:quote.credits,stored:!!row.audio_key,work:join(root,'renders/music-dna-songs',id),billing:'Disposable local TEST ledger; no customer charge',listening:'NOT RUN'};
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
 assert.equal(value.state,'completed',JSON.stringify(report));assert.ok(row.audio_key);assert.equal(balance.reserved,0);
 assert.equal((await dnaSong(request('GET',`?id=${id}`),{commerce,owner:'other'})).status,404);
 const ranged=request('GET',`?id=${id}&file=audio`);ranged.headers.set('range','bytes=0-43');const audio=await dnaSong(ranged,context);assert.equal(audio.status,206);assert.equal((await audio.arrayBuffer()).byteLength,44);
 const plan=JSON.parse(await readFile(join(root,'renders/music-dna-songs',id,'plan.json'),'utf8'));
 await writeFile(join(output,'report.json'),JSON.stringify({...report,title:plan.title,duration:plan.cases[0].duration,voice:plan.cases[0].vocal_identity,privacy:'PASS',rangePlayback:'PASS'},null,2));
}finally{await pool.end();await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);await admin.end();}
