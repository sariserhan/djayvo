// Real native URLSession + Better Auth + disposable loopback Postgres. No hosted writes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {Wallet} from '../lib/wallet.ts';
const [testRun,simulator,output]=process.argv.slice(2);
assert.ok(testRun&&simulator&&output,'Supply built xctestrun, simulator UUID, new output directory');
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.href),name='jamloom_native_'+randomUUID().replaceAll('-','');
await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.href),scratch=await mkdtemp(join(tmpdir(),'jamloom-native-')),base='http://127.0.0.1:4238';
let server;
async function run(cmd,args,env=process.env){const child=spawn(cmd,args,{env,stdio:'inherit'});const [code]=await once(child,'exit');assert.equal(code,0,cmd+' failed');}
try{
 await migrate(pool);
 const env={...process.env,DATABASE_URL:url.href,BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_COMING_SOON:'false',JAMLOOM_LOCAL_OUTBOX:join(scratch,'mail'),RESEND_API_KEY:'',APPLE_ROOT_CERTIFICATES_BASE64:'',VERCEL:''};
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4238'],{env,stdio:'ignore'});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/site-status')).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready);
 const signup=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'native@example.test',password:'Jamloom-native-test-password-739',name:'Native fixture'})});
 assert.equal(signup.status,200);const user=(await signup.json()).user;
 let message;for(let i=0;i<50&&!message;i++){try{for(const file of await readdir(env.JAMLOOM_LOCAL_OUTBOX)){const m=JSON.parse(await readFile(join(env.JAMLOOM_LOCAL_OUTBOX,file),'utf8'));if(m.to==='native@example.test'&&m.subject.includes('Verify'))message=m;}}catch{}if(!message)await delay(100);}
 assert.ok(message);assert.equal((await fetch(message.text.match(/https?:\/\/\S+/)[0],{redirect:'manual'})).status,302);
 await new Wallet(pool).grant(user.id,{provider:'apple_sandbox',receipt:'native-fixture',credits:10,netMicros:4_000_000});
 // This synthetic ledger lot tests display/sync only, never Apple receipt verification.
 const destination=resolve(output);await run('mkdir',[destination]);
 const copied=join(destination,'native.xctestrun');
 await run('python3',['-c',`import plistlib,sys\np=plistlib.load(open(sys.argv[1],'rb'))\ndef paths(v):\n if isinstance(v,str): return v.replace('__TESTROOT__',sys.argv[3])\n if isinstance(v,list): return [paths(x) for x in v]\n if isinstance(v,dict): return {k:paths(x) for k,x in v.items()}\n return v\np=paths(p)\np['JamloomTests'].setdefault('EnvironmentVariables',{})['JAMLOOM_ACCOUNT_TEST_ORIGIN']=sys.argv[4]\nplistlib.dump(p,open(sys.argv[2],'wb'))`,resolve(testRun),copied,dirname(resolve(testRun)),base]);
 await run('xcodebuild',['test-without-building','-xctestrun',copied,'-destination',`platform=iOS Simulator,id=${simulator}`,'-parallel-testing-enabled','NO','-only-testing:JamloomTests/AccountTests/testActualLocalAccountAndProfileSync','-resultBundlePath',join(destination,'tests.xcresult')]);
 assert.equal((await pool.query('SELECT count(*)::int n FROM taste_profiles')).rows[0].n,0);
 assert.equal((await pool.query('SELECT count(*)::int n FROM session')).rows[0].n,0);
 assert.deepEqual(await new Wallet(pool).balance(user.id),{available:10,reserved:0});
 await writeFile(join(destination,'report.json'),JSON.stringify({status:'PASS',scope:'actual simulator URLSession / Better Auth / disposable Postgres',checks:['sign-in cookie','wallet balance','catalogue profile save/load/delete','server session revoked','no credit consumption'],appleVerification:'NOT RUN - synthetic test lot',providerSpend:0},null,2));
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(scratch,{recursive:true,force:true});
}
