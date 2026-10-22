import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';import {mkdtemp,writeFile,readFile,mkdir,readdir,copyFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';import {join} from 'node:path';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';import {LocalGeneration} from '../lib/generation-local';import {localAudioStore} from '../lib/audio-store';import {PrivateAudio} from '../lib/private-audio';import {audioFixture,hash,input} from './audio-fixture';
test('extended score replay and private storage preserve exact bytes and owner isolation',async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url)),url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_duration_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),folder=await mkdtemp(join(root,'renders/duration-')),store=localAudioStore(join(folder,'private')),audio=new PrivateAudio(pool,store),service=new LocalGeneration(pool,store,'s'.repeat(32));
 try{
  const legacy=join(folder,'legacy-migrations');await mkdir(legacy);for(const file of await readdir(join(root,'apps/site/migrations')))if(file.endsWith('.sql')&&file<'0013')await copyFile(join(root,'apps/site/migrations',file),join(legacy,file));
  await migrate(pool,pathToFileURL(legacy+'/'));for(const owner of ['alice','bob'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
  const old=audioFixture(),prior=await audio.reserve('alice',input(old));await audio.localUpload('alice',prior.id,old);await audio.finalize('alice',prior.id);assert.deepEqual(await migrate(pool),['0013_audio_duration.sql']);assert.deepEqual((await audio.playback('alice',prior.id)).data,old);assert.deepEqual(await migrate(pool),[]);
  await new Wallet(pool).grant('alice',{provider:'stripe_test',receipt:name,credits:20,netMicros:8000000});
  for(const seconds of [15,20,60]){const wav=audioFixture(seconds),saved=await audio.reserve('alice',input(wav));await audio.localUpload('alice',saved.id,wav);await audio.finalize('alice',saved.id);assert.deepEqual((await audio.playback('alice',saved.id)).data,wav);await assert.rejects(audio.playback('bob',saved.id),/not found/);}
  for(const [sourceSeconds,duration] of [[1,15],[15,60]]){
   const source=audioFixture(sourceSeconds),path=join(folder,`source-${sourceSeconds}.wav`),prefix=join(folder,`native-${duration}`);await writeFile(path,source);
   execFileSync(join(root,'build-finish/jamloom_remix'),['--input',path,'--consent','--style','funk','--seed','4123','--duration-seconds',String(duration),'--output',prefix]);
   for(const invalid of [0,14,61])assert.throws(()=>execFileSync(join(root,'build-finish/jamloom_remix'),['--input',path,'--consent','--duration-seconds',String(invalid),'--output',prefix+'-invalid'],{stdio:'pipe'}),/duration must be 15..60/);
   const plan=await readFile(prefix+'.funk.score.json','utf8'),parsed=JSON.parse(plan);assert.equal(parsed.schema_version,'1.8-remix');assert.equal(parsed.requested_seconds,duration);
   const value={source:source.toString('base64'),plan,title:'Duration rehearsal',consent:true as const};
   await assert.rejects(service.quote('alice',{...value,plan:JSON.stringify({...parsed,requested_seconds:61})}),/duration/);
   await assert.rejects(service.quote('alice',{...value,plan:JSON.stringify({...parsed,schema_version:'1.7-remix'})}),/duration/);
   const quote=await service.quote('alice',value),id=await service.submit('alice','duration_'+duration,value,quote.token),result=await service.run(join(root,'build-finish/jamloom_remix'),folder);assert.ok(result&&'outputId' in result);assert.equal(result.id,id);
   assert.equal(hash((await audio.playback('alice',result.outputId)).data!),hash(await readFile(prefix+'.funk.wav')));await assert.rejects(audio.playback('bob',result.outputId),/not found/);
  }
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
