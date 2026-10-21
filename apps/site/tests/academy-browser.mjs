// Production Next server, disposable local Postgres, actual deck playback. No live services.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';import AxeBuilder from '@axe-core/playwright';import Stripe from 'stripe';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_academy_browser_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-academy-')),base='http://127.0.0.1:4223';
const evidence=new URL('../../../docs/evidence/academy/',import.meta.url),audio=new URL('../../../build-academy/',import.meta.url);
let server,logs='';const assessmentTrace=[];const results={database:'disposable loopback',human_learning:'NOT RUN',provider_transactions:'NOT RUN',browsers:[]};
try{
 await migrate(pool);await mkdir(audio,{recursive:true});
 const env={...process.env,DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:'sk_test_local_fixture',STRIPE_WEBHOOK_SECRET:'whsec_local_fixture',ACADEMY_STRIPE_WEBHOOK_SECRET:'whsec_academy_fixture',ACADEMY_STRIPE_PRICE_ID:'price_local_fixture',ACADEMY_STRIPE_PRODUCT_ID:'prod_local_fixture'};
 delete env.VERCEL;delete env.RESEND_API_KEY;delete env.ACADEMY_STRIPE_SANDBOX_ENABLED;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4223'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
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
 const cookie=await account('academy@example.test');
 assert.equal((await api('/api/academy/progress')).status,401);assert.equal((await api('/api/academy/lesson/gain-staging')).status,401);assert.equal((await api('/api/academy/lesson/gain-staging',{cookie})).status,403);
 assert.equal((await api('/api/academy/progress',{method:'DELETE',cookie,origin:'https://foreign.example'})).status,403);
 assert.equal((await api('/api/academy/checkout',{method:'POST',cookie,body:{key:randomUUID()}})).status,503);
 assert.equal((await api('/api/academy/stripe',{method:'POST',body:{id:'forged'}})).status,400);
 const stripe=new Stripe('sk_test_local_fixture');
 async function webhook(event,path='/api/academy/stripe',secret='whsec_academy_fixture'){const payload=JSON.stringify(event);return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload,secret})},body:payload});}
 const evt={id:'evt_academy_http',livemode:false,type:'fixture.ignored',data:{object:{}}};assert.equal((await webhook(evt)).status,200);assert.equal((await webhook(evt)).status,200);assert.equal((await webhook({...evt,data:{object:{changed:true}}})).status,503);assert.equal((await webhook({...evt,id:'evt_live',livemode:true})).status,403);
 assert.equal((await webhook({id:'evt_academy_on_credit_endpoint',livemode:false,type:'checkout.session.completed',data:{object:{payment_status:'paid',metadata:{jamloom_product:'academy-complete'}}}},'/api/payments/stripe','whsec_local_fixture')).status,200);
 assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  console.log('Testing',name);const browser=await engine.launch();try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin===base||r.request().url().startsWith('blob:')?r.continue():r.abort());
   const page=await context.newPage(),errors=[];let checkedMetrics=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.method()==='POST'&&r.url()===base+'/api/academy/result'){const {attemptId,...trace}=r.postDataJSON();assessmentTrace.push({browser:name,...trace});}});
   for(const path of ['/academy','/academy/learn','/academy/levels/beginner','/academy/practice','/academy/checkout','/academy/progress']){
    assert.equal((await page.goto(base+path)).status(),200,path);await page.locator('h1').waitFor();
    for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflow '+width);}
   }
   await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/academy');
   const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,failure:n.failureSummary}))})),[]);
   await page.screenshot({path:new URL(name+'-landing.png',evidence).pathname,fullPage:true});
   // Real Better Auth session, not a stubbed account API. Chromium saves progress; WebKit proves guest mode.
   if(name==='chromium')await context.addCookies(cookie.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
   await page.goto(base+'/academy/lessons/first-crossfade');await page.locator('#academy-load').waitFor();assert.ok(await page.locator('#academy-load').isDisabled());assert.equal(await page.locator('.academy-coach #music-rights').count(),1);assert.match(await page.locator('#academy-objective').innerText(),/^1\./);
   await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible',timeout:20000});
   await page.locator('#crossfade').focus();await page.keyboard.press('Home');
   await page.locator('#play-a').focus();await page.keyboard.press('Enter');await page.waitForTimeout(2300);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});
   assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,await page.locator('#academy-feedback').innerText());const before=await page.locator('#audio-a').evaluate(a=>a.currentTime);await page.waitForTimeout(1000);assert.ok(await page.locator('#audio-a').evaluate(a=>a.currentTime)>before);assert.match(await page.locator('#academy-stage').innerText(),/Task 1/);
   await page.locator('#academy-next').click();await page.locator('#play-b').focus();await page.keyboard.press('Enter');await page.waitForTimeout(2300);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,await page.locator('#academy-feedback').innerText());
   await page.locator('#academy-next').click();await page.locator('#academy-show').click();await page.locator('#academy-show').waitFor({state:'visible'});await page.waitForTimeout(1100);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-feedback').innerText(),/Your turn/);
   await page.locator('#academy-retry').click();await page.locator('#crossfade').focus();await page.keyboard.press('End');await page.waitForTimeout(1600);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.doesNotMatch(await page.locator('#academy-objective').innerText(),/Free Jam/);
   const rejected=await page.locator('#academy-feedback').innerText();await page.locator('#academy-retry').click();
   await page.locator('#crossfade').focus();await page.keyboard.press('Home');await page.waitForTimeout(300);
   await page.locator('#mix-record-consent').check();await page.locator('#mix-record-start').click();await page.waitForFunction(()=>!document.querySelector('#mix-record-stop').disabled);
   await page.locator('#crossfade').focus();for(let i=0;i<100;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(35);}
   await page.waitForTimeout(250);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,await page.locator('#academy-feedback').innerText());
   const feedback=await page.locator('#academy-feedback').innerText();await page.locator('#mix-record-stop').click();await page.locator('#mix-record-wav').waitFor({state:'visible',timeout:15000});
   for(const [id,file] of [['mix-record-wav',name+'-first-crossfade.wav'],['mix-record-json',name+'-recording.json'],['mix-record-automation',name+'-automation.json']]){
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();const download=await pending;await download.saveAs(new URL(file,audio).pathname);
   }
   const recording=JSON.parse(await readFile(new URL(name+'-recording.json',audio),'utf8'));assert.ok(Number.isSafeInteger(recording.timestamp_discontinuities)&&recording.timestamp_discontinuities>=0);assert.ok(recording.frames>recording.sample_rate*3);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL(name+'-lesson.png',evidence).pathname,fullPage:true});
   const lessonA11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(lessonA11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,failure:n.failureSummary}))})),[]);
   if(name==='chromium'){await page.waitForFunction(()=>document.querySelector('#academy-save').textContent.includes('saved to your account'));const progress=await(await api('/api/academy/progress',{cookie})).json();assert.equal(progress.attempts[0].checks.length,3);checkedMetrics=progress.attempts[0].checks;assert.ok(progress.attempts[0].completed_at);await page.reload();const restored=await(await api('/api/academy/progress',{cookie})).json();assert.equal(restored.attempts[0].checks.length,3);assert.equal(await page.locator('#audio-a').evaluate(a=>a.paused),true);}
   if(name==='chromium'){
    const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',['academy@example.test'])).rows[0].id;
    // Entitlement fixture only; provider grants are exercised separately with mocked Stripe retrieval.
    await pool.query("INSERT INTO academy_purchases(receipt,owner_id,product_key,price_id,payment_intent,amount_cents,currency,sandbox) VALUES('cs_browser', $1,'academy-complete','price_fixture','pi_browser',7999,'usd',true)",[owner]);
    assert.equal((await api('/api/academy/lesson/gain-staging',{cookie})).status,200);
    await page.goto(base+'/academy/lessons/gain-staging');await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});
    await page.locator('#crossfade').focus();await page.keyboard.press('Home');await page.locator('#play-a').click();await page.waitForTimeout(2400);
    for(const target of [null,50,75]){
     if(target!==null){await page.locator('#academy-next').click();await page.locator('#master').focus();await page.keyboard.press('Home');for(let i=0;i<target;i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(2300);}
     await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/,await page.locator('#academy-feedback').innerText());
    }
    await pool.query("UPDATE academy_purchases SET refund_hold=true WHERE receipt='cs_browser'");assert.equal((await api('/api/academy/lesson/gain-staging',{cookie})).status,403);
    assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
   }
   await page.goto(base+'/academy/challenges/first-crossfade');await page.locator('#academy-load').waitFor();assert.ok(await page.locator('#academy-show').isHidden());
   // A separate public-only cache, never a cached authorization or account response.
   await page.goto(base+'/academy-offline/index.html');await page.getByRole('button',{name:'Save free lesson offline',exact:true}).click();
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('.academy-actions p')).some(p=>p.textContent.startsWith('Saved.')),{},{timeout:80000});
   await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   if(name==='webkit'){
    // Playwright #42775: offline emulation rejects even literal service-worker navigation.
    // Stop the actual origin instead; a cache miss now fails without that emulator path.
    const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;await assert.rejects(fetch(base+'/academy'));
   }else await context.setOffline(true);
   await page.reload();await page.locator('#academy-load').waitFor();
   await page.locator('#music-rights').check();await page.locator('#academy-load').click();await page.locator('#academy-check').waitFor({state:'visible'});await page.locator('#crossfade').focus();await page.keyboard.press('Home');await page.locator('#play-a').click();await page.waitForTimeout(2300);await page.locator('#academy-check').click();await page.locator('#academy-check').waitFor({state:'hidden'});assert.match(await page.locator('#academy-objective').innerText(),/Free Jam/);
   const cache=await page.evaluate(async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith('jamloom-academy:'));const entries=(await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>r.url)))).flat();return entries;});assert.ok(cache.length>20);assert.ok(cache.every(u=>!u.includes('/api/')&&!u.includes('/account')));
   await context.setOffline(false);await page.getByRole('button',{name:'Remove offline lesson',exact:true}).click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.academy-actions p')).some(p=>p.textContent.startsWith('Offline lesson removed.')));
   assert.deepEqual(errors,[]);results.browsers.push({browser:name,version:browser.version(),keyboard_crossfade:'PASS',wrong_action_feedback:rejected,valid_feedback:feedback,free_jam:'PASS',offline_reload_and_audio:name==='chromium'?'PASS: browser offline mode':'PASS: origin server stopped; offline-emulator reload separately failed (#42775)',paid_access:name==='chromium'?'PASS (seeded local receipt)':'guest only',coach_does_not_grade:'PASS',assessment_metrics:checkedMetrics,wav:name+'-first-crossfade.wav',recording,audio_clock:recording.timestamp_discontinuities?'PARTIAL: recorder observed clock discontinuity; not zero-glitch proof':'PASS',accessibility:'PASS',widths:[1440,390,320],account_sync:name==='chromium'?'PASS':'guest checked'});
  }finally{await browser.close();}
 }
 await writeFile(new URL('assessment-trace.json',evidence),JSON.stringify({source:'Automated real deck playback of cleared Academy music; no human competency claim',trace:assessmentTrace},null,2)+'\n');
 results.status='PASS';await writeFile(new URL('browser.json',evidence),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await writeFile(new URL('browser-server.log',evidence),logs);await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
