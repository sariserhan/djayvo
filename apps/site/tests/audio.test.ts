import assert from 'node:assert/strict';
import test from 'node:test';
import { audioStore, localAudioStore } from '../lib/audio-store';
import { readConfig } from '../lib/config';
import { saveInput, validateWav, readBody } from '../lib/audio-validation';
import { audioFixture, hash, input } from './audio-fixture';

test('private save validates consent, bounded metadata and canonical metadata-free PCM',async()=>{
  const wav=audioFixture(), intent=input(wav);
  assert.equal(validateWav(wav,wav.length,hash(wav)),20000);
  assert.equal(saveInput(intent).strategy,'funk');
  for(const delta of [{consent:false},{requestId:'../secret'},{bytes:1},{sha256:'x'},{title:'\0'},{strategy:'unknown'},{owner:'someone'}]) assert.throws(()=>saveInput({...intent,...delta}));
  for(const offset of [0,4,8,16,20,22,24,28,32,34,36,40]) {
    const bad=Buffer.from(wav); bad[offset]^=1; assert.throws(()=>validateWav(bad,bad.length,hash(bad)));
  }
  const clipped=Buffer.from(wav);clipped.writeInt16LE(32767,44);assert.throws(()=>validateWav(clipped,clipped.length,hash(clipped)));
  const dc=Buffer.from(wav); for(let at=44;at<dc.length;at+=4){dc.writeInt16LE(16000,at);dc.writeInt16LE(-16000,at+2);}assert.throws(()=>validateWav(dc,dc.length,hash(dc)));
  assert.throws(()=>validateWav(wav,wav.length,'a'.repeat(64)));
  assert.throws(()=>validateWav(wav.subarray(0,-1),wav.length,hash(wav)));
  const request=new Request('http://localhost',{method:'PUT',body:'12345',headers:{'Content-Length':'1'}});
  await assert.rejects(readBody(request.body,4),/too large/);
  await assert.rejects(localAudioStore('/tmp/jamloom-unit').get('../secret',4),/Invalid object key/);
});
test('storage is opt-in, local files cannot be hosted, R2 grants bind content length and type',async()=>{
  const config=readConfig({DATABASE_URL:'postgresql://u:p@127.0.0.1/db',BETTER_AUTH_URL:'http://localhost:3000',BETTER_AUTH_SECRET:'a'.repeat(48),JAMLOOM_LOCAL_OUTBOX:'/tmp/mail'});
  assert.equal(audioStore(config,{}),null);
  assert.throws(()=>audioStore({...config,local:false},{JAMLOOM_LOCAL_AUDIO_DIR:'/tmp/audio'}));
  assert.throws(()=>audioStore(config,{JAMLOOM_LOCAL_AUDIO_DIR:'relative'}));
  assert.throws(()=>audioStore(config,{JAMLOOM_R2_ENABLED:'true'}));
  const store=audioStore(config,{JAMLOOM_R2_ENABLED:'true',R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'test-private',R2_ACCESS_KEY_ID:'test-key',R2_SECRET_ACCESS_KEY:'test-secret'})!;
  const url=new URL(await store.uploadURL('uploads/test.wav',3840044,120));
  assert.equal(url.hostname,`test-private.${'a'.repeat(32)}.r2.cloudflarestorage.com`);
  assert.equal(url.searchParams.get('X-Amz-Expires'),'120');
  assert.ok(url.searchParams.get('X-Amz-SignedHeaders')?.includes('content-length'));
  assert.ok(url.searchParams.get('X-Amz-SignedHeaders')?.includes('content-type'));
  assert.equal(new URL(await store.playbackURL('masters/test.wav')).searchParams.get('X-Amz-Expires'),'60');
  assert.match(new URL(await store.playbackURL('masters/test.wav',true)).searchParams.get('response-content-disposition')!,/^attachment/);
});

test('brand transition preserves legacy storage config without overriding explicit opt-outs', () => {
  const config = readConfig({DATABASE_URL:'postgresql://u:p@127.0.0.1/db', BETTER_AUTH_URL:'http://localhost:3000', BETTER_AUTH_SECRET:'a'.repeat(48), DJAYVO_LOCAL_OUTBOX:'/tmp/mail'});
  assert.equal(audioStore(config, { DJAYVO_LOCAL_AUDIO_DIR:'/tmp/legacy-audio' })?.local, true);
  assert.throws(() => audioStore({...config, local:false}, { DJAYVO_LOCAL_AUDIO_DIR:'/tmp/legacy-audio' }), /forbidden/);
  assert.equal(audioStore(config, { DJAYVO_LOCAL_AUDIO_DIR:'/tmp/legacy-audio', JAMLOOM_LOCAL_AUDIO_DIR:'' }), null);
  assert.equal(audioStore(config, { DJAYVO_R2_ENABLED:'true', JAMLOOM_R2_ENABLED:'false' }), null);
  assert.throws(() => audioStore(config, { DJAYVO_R2_ENABLED:'true' }), /incomplete/);
});
