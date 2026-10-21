// Runs against a fresh disposable loopback database; never hosted data or real email.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';import {emptyTaste} from '../lib/taste.ts';
import Stripe from 'stripe';
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.toString()),name='jamloom_http_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.toString()),folder=await mkdtemp(join(tmpdir(),'jamloom-http-')),base='http://127.0.0.1:4221';
let server;let logs='';const result={database:'disposable loopback',real_provider_transactions:'NOT RUN',checks:[]};
try{
 await migrate(pool);
 const env={...process.env,DATABASE_URL:url.toString(),BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_LOCAL_OUTBOX:join(folder,'mail'),STRIPE_SECRET_KEY:'sk_test_local_fixture',STRIPE_WEBHOOK_SECRET:'whsec_local_fixture'};
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
 const alice=await account('alice@example.test'),bob=await account('bob@example.test'),carol=await account('carol@example.test');
 result.checks.push('three signups, captured verification emails, real Better Auth sessions');
 assert.equal((await api('/api/taste')).status,401);
 assert.equal((await api('/api/taste',{method:'POST',body:{profile:emptyTaste,revision:0},cookie:alice,origin:'https://foreign.example'})).status,403);
 const saved=await api('/api/taste',{method:'POST',body:{profile:emptyTaste,revision:0},cookie:alice});assert.equal(saved.status,200);const revision=(await saved.json()).revision;
 assert.deepEqual(await (await api('/api/taste',{cookie:bob})).json(),{saved:null});
 const attempts=await Promise.all([110,130].map(tempo=>api('/api/taste',{method:'POST',body:{profile:{...emptyTaste,tempo},revision},cookie:alice})));assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 assert.equal((await api('/api/taste',{method:'POST',body:{profile:{...emptyTaste,tempo:999},revision:0},cookie:bob})).status,400);
 assert.equal((await api('/api/taste',{method:'POST',body:{profile:'x'.repeat(17000),revision:0},cookie:carol})).status,413);
 const current=(await (await api('/api/taste',{cookie:alice})).json()).saved;
 assert.equal((await api('/api/taste',{method:'DELETE',body:{revision:current.revision},cookie:bob})).status,409);
 assert.equal((await api('/api/taste',{method:'DELETE',body:{revision:current.revision},cookie:alice})).status,200);
 assert.deepEqual(await (await api('/api/taste',{cookie:alice})).json(),{saved:null});
 result.checks.push('taste auth, origin, owner isolation, concurrent revision, bounds, private deletion');
 for(const path of ['/account/credits','/account/purchases','/account/generations'])assert.equal((await api(path,{cookie:alice})).status,200);
 assert.equal((await api('/api/payments/checkout',{method:'POST',cookie:alice,body:{pack:'starter'}})).status,503);
 assert.equal((await api('/api/payments/stripe',{method:'POST',body:{id:'forged'}})).status,400);
 const stripe=new Stripe('sk_test_local_fixture');
 async function webhook(event){const payload=JSON.stringify(event);return fetch(base+'/api/payments/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_local_fixture'})},body:payload});}
 const fixture={id:'evt_local_fixture',livemode:false,type:'fixture.ignored',data:{object:{}}};
 assert.equal((await webhook(fixture)).status,200);assert.equal((await webhook(fixture)).status,200);
 assert.equal((await webhook({...fixture,data:{object:{changed:true}}})).status,503);
 assert.equal((await webhook({...fixture,id:'evt_live_fixture',livemode:true})).status,403);
 assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
 result.checks.push('private account views, purchases blocked, HTTP signature/body/replay/live-mode rejection; no credits minted');
 result.status='PASS';await writeFile(new URL('../../../docs/evidence/full-product/product-http.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});
}
