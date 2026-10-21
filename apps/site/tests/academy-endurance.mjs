// Production Next server, disposable local Postgres, actual deck playback. No live services.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
import {academyLessons,ACADEMY_VERSION} from '../lib/academy-content.ts';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
const audible=process.env.JAMLOOM_AUDIBLE_TEST==='1';
const selected=process.env.JAMLOOM_BROWSER;assert.ok(!selected||['chromium','webkit'].includes(selected),'Unsupported JAMLOOM_BROWSER');
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_academy_endurance_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const mode=process.argv[2]??'all';assert.ok(['all','short','half','hour'].includes(mode));
const port=process.env.JAMLOOM_ENDURANCE_PORT??(mode==='short'?'4226':'4225');
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-academy-')),base='http://127.0.0.1:'+port;
const evidence=new URL(audible?'../../../docs/evidence/academy-endurance/':'../../../docs/evidence/academy-endurance-silent/',import.meta.url),audio=new URL(audible?'../../../build-academy-endurance/':'../../../build-academy-endurance-silent/',import.meta.url);
let server,logs='';const results={speaker_output:audible?'AUDIBLE':'Muted downstream of recording taps; no physical-output claim',database:'disposable loopback',human_learning:'NOT RUN',provider_transactions:'NOT RUN',browsers:[]};
try{
 await migrate(pool);await mkdir(audio,{recursive:true});await mkdir(evidence,{recursive:true});
 const env={...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:'sk_test_local_fixture',STRIPE_WEBHOOK_SECRET:'whsec_local_fixture',ACADEMY_STRIPE_WEBHOOK_SECRET:'whsec_academy_fixture',ACADEMY_STRIPE_PRICE_ID:'price_local_fixture',ACADEMY_STRIPE_PRODUCT_ID:'prod_local_fixture'};
 delete env.VERCEL;delete env.RESEND_API_KEY;delete env.ACADEMY_STRIPE_SANDBOX_ENABLED;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{env,cwd:process.env.JAMLOOM_SITE_TEST_ROOT??new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/academy')).ok)break;}catch{}await delay(100);if(i===99)throw new Error('Server start timeout');}
 let address=1;
 async function api(path,{method='GET',body,cookie,origin=base,headers={}}={}){return fetch(base+path,{method,headers:{origin,'Content-Type':'application/json','x-real-ip':`192.0.2.${address++}`,...(cookie?{cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
 async function account(email){
  const password='Jamloom-local-academy-password-739';assert.equal((await api('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'Local Academy learner'}})).status,200);
  let message;for(let i=0;i<50&&!message;i++){try{for(const f of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
  assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
  const login=await api('/api/auth/sign-in/email',{method:'POST',body:{email,password}});assert.equal(login.status,200);
  return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }
 const cookie=await account('endurance@example.test');
 const learner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['endurance@example.test'])).rows[0].id;
 await pool.query("INSERT INTO academy_purchases(receipt,owner_id,product_key,price_id,payment_intent,amount_cents,currency,sandbox) VALUES('cs_endurance',$1,'academy-complete','price_fixture','pi_endurance',7999,'usd',true)",[learner]);
 // Isolate access setup from the actual recorded assessments; seeded rows are not learner evidence.
 for(const lesson of academyLessons)await pool.query('INSERT INTO academy_attempts(owner_id,lesson_id,version,completed_at) VALUES($1,$2,$3,now())',[learner,lesson.id,ACADEMY_VERSION]);
 async function run(engine,name){
  const browser=await engine.launch(!audible&&name==='chromium'?{args:['--mute-audio']}:{});
  async function lane(cases){
   const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
   if(!audible)await context.addInitScript(silenceSpeakers);
   await context.addCookies(cookie.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
   await context.route('**/*',r=>new URL(r.request().url()).origin===base||r.request().url().startsWith('blob:')?r.continue():r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const slider=async(id,value)=>page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   const checkSilent=async()=>{if(audible)return;const outputs=await page.evaluate(()=>globalThis.__jamloomSilentOutput());assert.ok(outputs.length>0);for(const output of outputs){assert.equal(output.gain,0);assert.equal(output.peak,0);}};
   const play=async id=>{if((await page.locator('#play-'+id).innerText()).startsWith('Play'))await page.locator('#play-'+id).click();};
   try{for(const [lessonId,seconds] of cases){
    const label=name+'-'+lessonId+'-'+seconds,trace=[];let payloadBytes=0;
    const capture=r=>{if(r.method()==='POST'&&r.url()===base+'/api/academy/result'){payloadBytes=Math.max(payloadBytes,Buffer.byteLength(r.postData()));const {attemptId,...data}=r.postDataJSON();trace.push(data);}};
    page.on('request',capture);
    const row={browser:name,version:browser.version(),lesson:lessonId,requested_seconds:seconds,status:'RUNNING',started_at:new Date().toISOString()};results.browsers.push(row);
    await page.goto(base+'/academy/challenges/'+lessonId);await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible',timeout:20000});
    assert.match(await page.locator('#academy-save').innerText(),/Signed in/);
    await slider('crossfade',0);await play('a');await play('b');await checkSilent();
    await page.locator('#loop-a').click();await page.locator('#loop-b').click();
    const lesson=academyLessons.find(l=>l.id===lessonId);
    if(lesson.tasks[0].kind==='tempo'){
     await slider('rate-b',1);await page.waitForTimeout(9000);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});
     assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,await page.locator('#academy-feedback').innerText());
     await page.waitForFunction(()=>document.querySelector('#academy-save').textContent.includes('saved to your account'));
     await page.locator('#academy-next').click();
    }
    await page.locator('#set-record-consent').check();await page.locator('#set-record-start').click();
    await page.waitForFunction(()=>document.querySelector('#set-record-status').textContent.startsWith('Recording private set'));
    const started=Date.now(),task=lesson.tasks.at(-1);let side=0,nextTransition=1;
    // Exercise every transition early enough to retain recovery and finalization time at the actual 60-minute cap.
    const interval=Math.floor((seconds-20)/(task.transitions+1));let nextLog=60;
    while((Date.now()-started)/1000<seconds+305){
     const elapsed=(Date.now()-started)/1000;
     if(elapsed>=nextLog){await checkSilent();console.log(label,Math.round(elapsed)+'s',await page.locator('#set-record-status').innerText());nextLog+=60;}
     if(elapsed>=interval*nextTransition&&nextTransition<=task.transitions){
      for(let n=0;n<=20;n++){await slider('crossfade',side?1-n/20:n/20);await page.waitForTimeout(250);}
      side=1-side;nextTransition++;
     }
     if(task.recovery&&nextTransition===3&&side===0&&!row.recovery){
      await page.locator('#cue-b').click();await page.waitForTimeout(1500);await play('b');row.recovery='cue then restart while A audible';
     }
     if(await page.locator('#set-record-download').isVisible())break;
     const measured=Number((await page.locator('#set-record-status').innerText()).match(/· (\d+) \//)?.[1]??0);
     if(seconds<3600&&measured>=seconds+2)break;
     // The automatic cap disables Stop before encoding/hash completion exposes the download.
     if(await page.locator('#set-record-stop').isDisabled()){assert.equal(seconds,3600,label+': '+await page.locator('#set-record-status').innerText());break;}
     await page.waitForTimeout(1000);
    }
    if(seconds===3600){await page.locator('#set-record-download').waitFor({state:'visible',timeout:10000});row.automatic_cap='PASS';}
    else{await page.locator('#set-record-stop').click();await page.locator('#set-record-download').waitFor({state:'visible',timeout:20000});}
    for(const [id,suffix] of [['set-record-download','.audio'],['set-record-details','.json']]){const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(new URL(label+suffix,audio).pathname);}
    await checkSilent();row.speaker_output=audible?'AUDIBLE':'PASS: final output gain and samples remain zero';
    row.receipt=JSON.parse(await readFile(new URL(label+'.json',audio),'utf8'));row.wall_seconds=(Date.now()-started)/1000;
    await page.screenshot({path:new URL(label+'.png',evidence).pathname,fullPage:false});
    assert.ok(row.receipt.seconds>=Math.min(seconds,3600),label+' short capture');assert.equal(row.receipt.gaps,0,label+' clock discontinuity');
    await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});
    row.feedback=await page.locator('#academy-feedback').innerText();
    assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,label+': '+row.feedback);
    await page.waitForFunction(()=>document.querySelector('#academy-save').textContent.includes('saved to your account'),{},{timeout:15000});
    row.payload_bytes=payloadBytes;row.status='PASS';row.completed_at=new Date().toISOString();
    await writeFile(new URL(label+'-trace.json',evidence),JSON.stringify(trace)+'\n');
    await writeFile(new URL('progress.json',evidence),JSON.stringify(results,null,2)+'\n');
    page.off('request',capture);await page.locator('#set-record-delete').click();assert.ok(await page.locator('#set-record-download').isHidden());
    console.log('PASS',label,JSON.stringify(row.receipt));
   }assert.deepEqual(errors,[]);
   }catch(error){console.error(name,JSON.stringify(cases),error);await page.screenshot({path:new URL(name+'-'+mode+'-failure.png',evidence).pathname,fullPage:false}).catch(()=>{});throw error;}finally{await context.close();}
  }
  // Real-time audio runs one recording at a time; concurrent browsers add unrelated device/load interference.
  try{
   if(['all','hour'].includes(mode))await lane([['performance-set',3600]]);
   if(['all','short'].includes(mode))await lane([['elementary-assessment',120],['intermediate-set',300],['advanced-set',300],['performance-set',1800]]);
   if(mode==='half')await lane([['performance-set',1800]]);
  }finally{await browser.close();}
 }
 results.errors=[];
 for(const [name,engine] of Object.entries({chromium,webkit}).filter(([name])=>!selected||name===selected)){
  try{await run(engine,name);}catch(error){results.errors.push(String(error?.stack??error));}
 }
 results.status=results.errors.length?'FAIL':'PASS';
 await writeFile(new URL(mode+'-browser.json',evidence),JSON.stringify(results,null,2)+'\n');assert.deepEqual(results.errors,[]);console.log('All real-time endurance runs PASS');
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await writeFile(new URL(mode+'-server.log',evidence),logs);await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
