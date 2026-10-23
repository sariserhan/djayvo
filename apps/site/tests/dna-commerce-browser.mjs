// Real local HTTP/auth/ledger; synthetic worker audio is not model or listening evidence.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';import {Wallet} from '../lib/wallet.ts';import {silenceSpeakers} from './silent-audio.mjs';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_dna_http_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-dna-http-')),root=join(folder,'worker'),base='http://127.0.0.1:4253';
let server,logs='';const results=[];
try{
 await migrate(pool);
 for(const path of ['.venv-singer/bin','scripts','build-style-training/taste-auditor'])await mkdir(join(root,path),{recursive:true});
 await writeFile(join(root,'scripts/music_dna_song.py'),'fixture');await writeFile(join(root,'build-style-training/taste-auditor/pytorch_model.bin'),'fixture');
 await writeFile(join(root,'.venv-singer/bin/python'),`#!${process.execPath}
const fs=require('node:fs'),crypto=require('node:crypto');const work=process.argv[4],sha=v=>crypto.createHash('sha256').update(v).digest('hex');
setTimeout(()=>{const input=fs.readFileSync(work+'/input.json'),saved=JSON.parse(input),wav=Buffer.alloc(44+48000*4*120);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(192000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<48000*120;i++){const n=Math.round(1000*Math.sin(2*Math.PI*220*i/48000));wav.writeInt16LE(n,44+i*4);wav.writeInt16LE(n,46+i*4);}
const plan=JSON.stringify({title:'HTTP credit test '+work.slice(-6),summary:'Synthetic worker fixture',direction:saved.direction,input_sha256:sha(input),language:{code:'en',label:'English'},influences:saved.profile.references.map(reference=>({reference,basis:'genre_only',description:'Test'})),cases:[{lyrics:'[Verse]\\nSynthetic test',vocal_language:'en',voice:'female',bpm:110,song_caption:'Fixture'}]});
fs.mkdirSync(work+'/singer');fs.writeFileSync(work+'/singer/singer.wav',wav);fs.writeFileSync(work+'/plan.json',plan);const receipt={plan_sha256:sha(plan),audio_sha256:sha(wav)};fs.writeFileSync(work+'/singer/complete.json',JSON.stringify(receipt));fs.writeFileSync(work+'/fit.json',JSON.stringify({...receipt,input_sha256:sha(input),accepted:true,target:saved.direction.id}));fs.writeFileSync(work+'/status.json',JSON.stringify({state:'completed'}));},500);`,{mode:0o700});
 const env={...process.env,DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),JAMLOOM_COMING_SOON:'false',JAMLOOM_DNA_CREDITS_SANDBOX:'true',JAMLOOM_DNA_SINGER_ROOT:root};
 delete env.VERCEL;delete env.RESEND_API_KEY;delete env.JAMLOOM_LOCAL_AUDIO_DIR;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4253'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/music-dna')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Server did not start');}
 let ip=1;
 async function api(path,{method='GET',body,cookie,origin=base,headers={}}={}){return fetch(base+path,{method,headers:{origin,'Content-Type':'application/json','X-Jamloom-DNA':'1','x-real-ip':`192.0.2.${ip++}`,...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
 async function account(email){
  const password=randomUUID()+randomUUID();assert.equal((await api('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'DNA test listener'}})).status,200);
  let message;
  for(let i=0;i<50&&!message;i++){try{for(const file of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,file),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
  assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
  const login=await api('/api/auth/sign-in/email',{method:'POST',body:{email,password}});assert.equal(login.status,200);return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }
 const alice=await account('dna-alice@example.test'),bob=await account('dna-bob@example.test');
 const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['dna-alice@example.test'])).rows[0].id;
 const wallet=new Wallet(pool);await wallet.grant(owner,{provider:'stripe_test',receipt:name,credits:20,netMicros:10_000_000});
 assert.equal((await api('/api/taste/song',{method:'POST',body:{}})).status,401);
 assert.equal((await api('/api/taste/song',{method:'POST',body:{},cookie:alice,origin:'https://foreign.example'})).status,503);
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch(engineName==='chromium'?{args:['--mute-audio']}:{});
  try{
   const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
   await context.addCookies(alice.split('; ').map(pair=>({name:pair.slice(0,pair.indexOf('=')),value:pair.slice(pair.indexOf('=')+1),url:base})));
   await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Private favorite — Private artist'],referenceMetadata:[{reference:'Private favorite — Private artist',genre:'Pop',source:'itunes'}],vocalLanguage:'en',energy:'balanced',tempo:100,instruments:['piano'],novelty:50})));
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/music-dna');
   const before=await wallet.balance(owner),jobs=[];
   for(const visibility of ['public','private']){
    await page.getByRole('button',{name:jobs.length?'Make another song':'Make my music',exact:true}).click();
    await page.getByRole('radio',{name:visibility==='public'?'Public · from 1 credit':'Private · from 2 credits',exact:true}).check();
    if(visibility==='public')await page.getByRole('checkbox',{name:'I agree to publish this new song on the community page.'}).check();
    const submitted=page.waitForResponse(r=>r.url()===base+'/api/taste/song'&&r.request().method()==='POST'&&r.request().postDataJSON().action==='submit');
    await page.getByRole('button',{name:/^Generate song/}).click();
    const response=await submitted;assert.equal(response.status(),202);const {id}=await response.json();jobs.push({id,visibility});
    await page.locator(`#dna-notebook audio[src*="id=${id}&"]`).waitFor({timeout:15000});
    await page.getByRole('region',{name:'Your songs',exact:true}).locator(`audio[src*="id=${id}&"]`).waitFor();
    const publicAudio=await api(`/api/taste/song?id=${id}&file=audio`,{cookie:bob});assert.equal(publicAudio.status,visibility==='public'?200:404);
    const anonymous=await api(`/api/taste/song?id=${id}&file=audio`);assert.equal(anonymous.status,visibility==='public'?200:404);
    const detail=await api('/api/taste/song?id='+id,{cookie:bob});if(visibility==='public')assert.ok(!(await detail.text()).includes('Private favorite'));
    const replay=await api('/api/taste/song',{method:'POST',cookie:alice,body:response.request().postDataJSON()});assert.equal(replay.status,202);assert.equal((await replay.json()).id,id);
   }
   assert.deepEqual(await wallet.balance(owner),{available:before.available-3,reserved:0});
   const feed=await(await api('/api/taste/song?view=public')).json();assert.ok(feed.songs.some(s=>s.id===jobs[0].id));assert.ok(!feed.songs.some(s=>s.id===jobs[1].id));
   for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await page.getByRole('region',{name:'Your songs',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(folder,engineName+'-songs.png')});
   assert.deepEqual((await new AxeBuilder({page}).include('#dna-notebook').analyze()).violations,[]);assert.deepEqual(errors,[]);
   await page.goto(base+'/');
   const homeSongs=page.getByRole('region',{name:'Community songs · Music DNA',exact:true});
   await homeSongs.locator(`audio[src*="id=${jobs[0].id}&"]`).waitFor();
   assert.equal(await homeSongs.locator(`audio[src*="id=${jobs[1].id}&"]`).count(),0);
   assert.equal((await api('/api/taste/song?id='+jobs[0].id,{method:'DELETE',cookie:alice})).status,200);
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await homeSongs.locator(`audio[src*="id=${jobs[0].id}&"]`).waitFor({state:'detached'});
   assert.deepEqual(errors,[]);
   results.push({homepage_public_only:true,homepage_withdrawal_refresh:true,browser:engineName,status:'PASS',real_auth:true,real_postgres:true,worker:'synthetic process fixture',public_credits:1,private_credits:2,duplicate_charges:0,private_cross_owner_status:404,private_anonymous_status:404,public_feed_excludes_private:true,widths:[1280,390,320],axe_violations:0,errors});
  }finally{await browser.close();}
 }
 await writeFile('/tmp/jamloom-dna-commerce-browser.json',JSON.stringify({status:'PASS',folder,results},null,2));console.log(JSON.stringify({status:'PASS',folder,results}));
}finally{
 if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await writeFile(join(folder,'server.log'),logs);await rm(root,{recursive:true,force:true});await rm(join(folder,'mail'),{recursive:true,force:true});
}
