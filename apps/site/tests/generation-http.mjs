// Runs against a fresh disposable loopback database; never hosted data or real email.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';import {emptyTaste} from '../lib/taste.ts';
import {fileURLToPath} from 'node:url';
import {Wallet} from '../lib/wallet.ts';import {LocalGeneration} from '../lib/generation-local.ts';import {localAudioStore} from '../lib/audio-store.ts';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import {silenceSpeakers} from './silent-audio.mjs';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_http_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-http-')),base='http://127.0.0.1:4221';
let server;let logs='';const result={database:'disposable loopback',real_provider_transactions:'NOT RUN',checks:[]};
try{
 await migrate(pool);
 const env={...process.env,DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),JAMLOOM_COMING_SOON:'false',JAMLOOM_GENERATION_SANDBOX:'true',JAMLOOM_LOCAL_AUDIO_DIR:join(folder,'audio'),STRIPE_SECRET_KEY:'sk_test_local_fixture',STRIPE_WEBHOOK_SECRET:'whsec_local_fixture'};
 delete env.VERCEL;delete env.RESEND_API_KEY;delete env.APPLE_ROOT_CERTIFICATES_BASE64;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4221'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>{logs+=s});server.stderr.on('data',s=>{logs+=s});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/')).ok)break;}catch{}await delay(100);if(i===99)throw new Error('Local server did not start');}
 let address=1;
 async function api(path,{method='GET',body,cookie,origin=base,headers={}}={}){return fetch(base+path,{method,headers:{origin,'Content-Type':'application/json','x-real-ip':`192.0.2.${address++}`,...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
 async function account(email){
  const password='Jamloom-local-only-password-739';assert.equal((await api('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'Local HTTP listener'}})).status,200);
  let message;
  for(let i=0;i<50&&!message;i++){try{for(const file of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,file),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
  assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
  const login=await api('/api/auth/sign-in/email',{method:'POST',body:{email,password}});assert.equal(login.status,200);
  return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }
 const alice=await account('alice@example.test'),bob=await account('bob@example.test');
 const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['alice@example.test'])).rows[0].id;
 await new Wallet(pool).grant(owner,{provider:'stripe_test',receipt:'http_fixture',credits:20,netMicros:8000000});
 assert.equal((await api('/api/generations')).status,401);
 assert.equal((await api('/api/generations',{method:'POST',cookie:alice,origin:'https://foreign.example',body:{action:'quote'}})).status,403);
 const fixture=new URL('../../../renders/full-product-baseline-20261020/ls-2277-149896-0026/',import.meta.url);
 const input={source:(await readFile(new URL('source.wav',fixture))).toString('base64'),plan:await readFile(new URL('A.reggae.score.json',fixture),'utf8'),title:'HTTP generation',consent:true};
 const quoted=await api('/api/generations',{method:'POST',cookie:alice,body:{action:'quote',input}});assert.equal(quoted.status,200);assert.match(quoted.headers.get('cache-control'),/no-store/);const quote=await quoted.json();
 assert.equal(quote.credits,2);
 assert.equal((await api('/api/generations',{method:'POST',cookie:bob,body:{action:'submit',requestId:'foreign_quote',input,token:quote.token}})).status,400);
 const body={action:'submit',requestId:'same_http_request',input,token:quote.token};
 const submits=await Promise.all([api('/api/generations',{method:'POST',cookie:alice,body}),api('/api/generations',{method:'POST',cookie:alice,body})]);
 assert.deepEqual(submits.map(r=>r.status),[200,200]);const ids=await Promise.all(submits.map(r=>r.json()));assert.equal(ids[0].id,ids[1].id);
 assert.deepEqual(await (await api('/api/generations',{cookie:bob})).json(),{jobs:[]});
 assert.equal((await api('/api/generations',{method:'POST',cookie:bob,body:{action:'cancel',id:ids[0].id}})).status,400);
 assert.equal((await api('/api/generations',{method:'POST',cookie:alice,body:{action:'cancel',id:ids[0].id}})).status,200);
 const service=new LocalGeneration(pool,localAudioStore(env.JAMLOOM_LOCAL_AUDIO_DIR),env.BETTER_AUTH_SECRET);
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
  try{
   const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(silenceSpeakers);
   await context.addCookies(alice.split('; ').map(pair=>({name:pair.slice(0,pair.indexOf('=')),value:pair.slice(pair.indexOf('=')+1),url:base})));
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/account/generations');await page.waitForFunction(()=>document.querySelector('input[type=file]')?.disabled===false);await page.getByLabel('Source WAV, 2–5 seconds').setInputFiles(fileURLToPath(new URL('source.wav',fixture)));
   await page.getByLabel('Matching Jamloom score').setInputFiles(fileURLToPath(new URL('A.reggae.score.json',fixture)));
   await page.getByLabel('I have permission to upload').check();await page.getByRole('button',{name:'Get exact credit quote'}).click();
   await page.getByRole('button',{name:'Accept quote and queue'}).click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="status"]')).some(e=>e.textContent.startsWith('Queued')));
   const rendered=await service.run(fileURLToPath(new URL('../../../build-finish/jamloom_remix',import.meta.url)),folder);assert.equal(rendered.state,'completed');
   await page.locator('a[href="/api/library/'+rendered.outputId+'/audio"]').waitFor({timeout:15000});
   assert.equal((await api('/api/library/'+rendered.outputId+'/audio',{cookie:bob})).status,404);
   const wav=await api('/api/library/'+rendered.outputId+'/audio',{cookie:alice});assert.equal(wav.status,200);assert.ok((await wav.arrayBuffer()).byteLength>3840044);
   for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){await page.screenshot({path:join(folder,name+'-overflow-'+width+'.png'),fullPage:true});console.log('Overflow',folder,width,await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth).slice(-10).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width,e.textContent?.slice(0,60)])));}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await page.screenshot({path:join(folder,name+'-generation.png'),fullPage:true});assert.deepEqual(errors,[]);
   result.checks.push(name+': real login, exact quote acceptance, local worker, polled result, private playback, responsive, axe');
  }finally{await browser.close();}
 }
 result.status='PASS';result.folder=folder;result.checks.push('HTTP authentication, origin, cross-owner quote/cancel rejection, concurrent idempotent submit, cancellation');
 await writeFile(new URL('../../../docs/evidence/spec-completion/generation-http.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await writeFile(join(folder,'server.log'),logs);
}
