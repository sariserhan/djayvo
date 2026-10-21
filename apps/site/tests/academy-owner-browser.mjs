// Verified owner preview, actual auth/server/UI; no purchased receipt or graded outcome fabricated.
import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';import{mkdtemp,readdir,readFile,writeFile,mkdir,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{spawn}from'node:child_process';import{once}from'node:events';import{setTimeout as delay}from'node:timers/promises';
import{chromium,webkit}from'playwright';import AxeBuilder from '@axe-core/playwright';import{createPool}from'../lib/database.ts';import{migrate}from'../lib/migrations.ts';import{OWNER_EMAIL}from'../lib/admin-access.ts';import{ACADEMY_VERSION}from'../lib/academy-content.ts';import{silenceSpeakers}from'./silent-audio.mjs';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_owner_preview_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-owner-preview-')),base='http://127.0.0.1:4229',evidence=new URL('../../../docs/evidence/academy-owner-preview/',import.meta.url);let server,logs='';const rows=[];
try{
 await migrate(pool);await mkdir(evidence,{recursive:true});
 const env={...process.env,JAMLOOM_COMING_SOON:'false',DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail')};delete env.VERCEL;delete env.RESEND_API_KEY;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4229'],{env,cwd:process.env.JAMLOOM_SITE_TEST_ROOT??new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/academy')).ok)break;}catch{}await delay(100);if(i===99)throw Error('Server start timeout');}
 let ip=1;const api=(path,cookie,body)=>fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{origin:base,'Content-Type':'application/json','x-real-ip':`192.0.2.${ip++}`,...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 async function account(email){
  const password='Local-owner-preview-check-739';assert.equal((await api('/api/auth/sign-up/email',null,{email,password,name:'Local preview tester'})).status,200);
  let message;for(let i=0;i<80&&!message;i++){try{for(const f of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,f),'utf8'));if(m.to===email&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}assert.ok(message);
  assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);const login=await api('/api/auth/sign-in/email',null,{email,password});assert.equal(login.status,200);return login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 }
 const owner=await account(OWNER_EMAIL),learner=await account('owner-preview-learner@example.test');
 const ownerId=(await pool.query('SELECT id FROM "user" WHERE email=$1',[OWNER_EMAIL])).rows[0].id;
 assert.equal((await api('/api/academy/progress')).status,401);
 const progress=await(await api('/api/academy/progress',owner)).json();assert.equal(progress.access,true);assert.equal(progress.ownerPreview,true);assert.deepEqual(progress.attempts,[]);
 assert.equal((await(await api('/api/academy/progress',learner)).json()).access,false);
 assert.equal((await api('/api/academy/lesson/gain-staging',owner)).status,403);
 // Seed only the prerequisite to isolate page authorization; never report this as human learning.
 await pool.query('INSERT INTO academy_attempts(owner_id,lesson_id,version,completed_at) VALUES($1,$2,$3,now())',[ownerId,'first-crossfade',ACADEMY_VERSION]);
 assert.equal((await api('/api/academy/lesson/gain-staging',owner)).status,200);assert.equal((await api('/api/academy/lesson/gain-staging',learner)).status,403);
 for(const [name,engine]of Object.entries({chromium,webkit})){
  const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());await context.addCookies(owner.split('; ').map(v=>({name:v.slice(0,v.indexOf('=')),value:v.slice(v.indexOf('=')+1),url:base})));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/academy/learn');await page.getByRole('status').filter({hasText:'Owner course preview'}).waitFor();assert.equal(await page.locator('h1').innerText(),'Make your next move.');
   const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a11y.violations.map(v=>v.id),[]);
   await page.screenshot({path:new URL(name+'-owner-preview.png',evidence).pathname});
   await page.getByRole('link',{name:'Leave room in the mix',exact:true}).click();await page.locator('#academy-objective').waitFor({state:'visible'});assert.ok(page.url().includes('/academy/lessons/gain-staging'));assert.deepEqual(errors,[]);
   rows.push({browser:name,version:browser.version(),status:'PASS',owner_label:'PASS',paid_lesson_access:'PASS',prerequisite_fixture:'seeded access setup only',axe_violations:0,console_errors:errors,speaker_output:'muted; no playback started'});
  }finally{await browser.close();}
 }
 for(const [column,value]of [['"emailVerified"',false],['suspended',true]]){await pool.query(`UPDATE "user" SET ${column}=$1 WHERE id=$2`,[value,ownerId]);assert.equal((await api('/api/academy/progress',owner)).status,401);await pool.query(`UPDATE "user" SET ${column}=$1 WHERE id=$2`,[!value,ownerId]);}
 assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases')).rows[0].n,0);
 await writeFile(new URL('browser.json',evidence),JSON.stringify({status:'PASS',browsers:rows,owner_purchase_rows:0,guest_and_member_denial:'PASS',unverified_and_suspended:'PASS',prerequisites:'PASS',live_billing:'NOT RUN'},null,2)+'\n');console.log('Owner preview browser checks PASS');
}finally{if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}await writeFile(new URL('server.log',evidence),logs);await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});}
