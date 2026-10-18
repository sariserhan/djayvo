import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { chromium,webkit } from 'playwright';
import { audioFixture,input } from './audio-fixture.ts';

process.loadEnvFile('.env.local');
const base=process.env.BETTER_AUTH_URL,dbURL=new URL(process.env.DATABASE_URL);
assert.equal(new URL(base).hostname,'localhost');assert.equal(dbURL.hostname,'127.0.0.1');assert.ok(process.env.DJAYVO_LOCAL_OUTBOX);assert.ok(process.env.DJAYVO_LOCAL_AUDIO_DIR);
const kind=process.env.DJAYVO_BROWSER||'chromium';assert.ok(['chromium','webkit'].includes(kind));
const output=await mkdtemp(new URL('../../../renders/catalogue-browser-',import.meta.url).pathname);console.log('Evidence: '+output);
const pool=new Pool({connectionString:dbURL.toString()}),browser=await (kind==='webkit'?webkit:chromium).launch();
const contexts=await Promise.all(Array.from({length:4},(_,i)=>browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'x-real-ip':`192.0.2.${(kind==='webkit'?130:120)+i}`}})));
const [owner,reviewer,listener,anonymous]=contexts,emails=[`catalogue-${randomUUID()}@example.com`,`catalogue-review-${kind}@example.com`,`catalogue-${randomUUID()}@example.com`];
const users=[],checks=[],errors=[],consoleErrors=[],captureWarnings=[],expectedValidationErrors=[];
const pages=await Promise.all(contexts.map(c=>c.newPage()));
const [op,rp,lp,ap]=pages;
let capturing=false,expectingReviewDenial=false;
for(const page of pages){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){if(page===rp&&expectingReviewDenial&&/status of 400/.test(m.text()))expectedValidationErrors.push(m.text());else if(kind==='webkit'&&capturing&&m.text().startsWith('Refused to apply a stylesheet because its hash, its nonce,'))captureWarnings.push(m.text());else consoleErrors.push(m.text());}});}
const check=name=>{checks.push({name,status:'PASS'});console.log('PASS: '+name);};
async function shot(page,name){capturing=true;try{await page.screenshot({path:join(output,name+'.png'),fullPage:true,caret:'initial'});}finally{capturing=false;}}
async function post(context,path,body={}){return context.request.post(base+path,{data:body,headers:{origin:base}});}
async function signup(context,email){
  assert.equal((await pool.query('SELECT count(*)::int n FROM "user" WHERE email=$1',[email])).rows[0].n,0,'Do not overwrite an existing account fixture.');
  const password='Djayvo-catalogue-local-test-729';
  const response=await post(context,'/api/auth/sign-up/email',{email,name:'Synthetic local test',password});assert.equal(response.status(),200);
  const user=(await response.json()).user;users.push(user.id);
  // Role fixtures only; real email verification is covered by the account browser suite.
  await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[user.id]);
  assert.equal((await post(context,'/api/auth/sign-in/email',{email,password})).status(),200);return user;
}
let track;
try{
  const u=await signup(owner,emails[0]);await signup(reviewer,emails[1]);await signup(listener,emails[2]);
  assert.equal((await reviewer.request.get(base+'/api/catalogue/review')).status(),200,'Start test server with the documented synthetic reviewer allowlist.');
  const wav=audioFixture(),intent=await post(owner,'/api/library',{...input(wav),title:'Local catalogue test'});assert.equal(intent.status(),200);track=await intent.json();
  assert.equal((await owner.request.put(base+track.url,{data:wav,headers:{origin:base,'Content-Type':'audio/wav'}})).status(),200);
  assert.equal((await post(owner,`/api/library/${track.id}/finalize`)).status(),200);
  assert.equal((await anonymous.request.get(base+`/api/catalogue/${track.id}`)).status(),404);
  assert.equal((await owner.request.get(base+'/api/catalogue/review')).status(),403);
  assert.equal((await post(owner,`/api/catalogue/${track.id}/review`,{decision:'approved'})).status(),403);
  check('private mix excluded from public metadata/audio; ordinary accounts cannot review');
  await op.goto(base+'/library');await op.getByText('Submit this mix for catalogue review',{exact:true}).click();
  await op.getByLabel('Public credit',{exact:true}).fill('Test credit');await op.getByLabel('Description',{exact:true}).fill('Synthetic fixture for local workflow checks.');
  await op.getByLabel('Submission mood',{exact:true}).selectOption('playful');
  await op.getByRole('button',{name:'Submit for review',exact:true}).click();
  assert.equal((await pool.query('SELECT count(*)::int n FROM catalogue_submissions WHERE track_id=$1',[track.id])).rows[0].n,0);
  await op.getByRole('checkbox',{name:/I have permission to publish this complete mix/}).check();
  await op.getByRole('button',{name:'Submit for review',exact:true}).click();await op.getByRole('status').filter({hasText:'Submitted for review'}).waitFor();
  assert.equal((await anonymous.request.get(base+`/api/catalogue/${track.id}/audio`)).status(),404);
  check('separate public-listening consent is required; pending submission stays private');
  await rp.goto(base+'/review');const review=rp.locator('.library-list li').filter({hasText:'Local catalogue test'});
  await review.locator('audio').evaluate(async a=>{a.muted=true;await a.play();a.pause();});
  await review.getByLabel('Review note',{exact:true}).fill('Synthetic workflow fixture, not human quality or rights evidence.');await review.getByLabel('Decision',{exact:true}).selectOption('approved');
  expectingReviewDenial=true;
  const denied=rp.waitForResponse(r=>r.url().endsWith(`/api/catalogue/${track.id}/review`)&&r.status()===400);
  await review.getByRole('button',{name:'Save review',exact:true}).click();await denied;await review.getByRole('status').filter({hasText:'Confirm listening'}).waitFor();expectingReviewDenial=false;
  await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Save review',exact:true}).click();await review.waitFor({state:'detached'});
  const publicTrack=await (await anonymous.request.get(base+`/api/catalogue/${track.id}`)).json();assert.deepEqual(Object.keys(publicTrack).sort(),['artist','description','duration_ms','id','mood','strategy','title']);
  assert.deepEqual(await (await anonymous.request.get(base+`/api/catalogue/${track.id}/audio`)).body(),wav);
  check('authorized distinct reviewer confirmation publishes only explicit public fields and identical audio');
  await ap.goto(base+'/catalogue');assert.match(await ap.title(),/Djayvo/);await ap.locator('.music-player audio').evaluate(a=>a.muted=true);
  await ap.getByRole('button',{name:'Play Local catalogue test',exact:true}).click();await ap.waitForFunction(()=>document.querySelector('.music-player audio').currentTime>.1);
  await ap.locator('.music-player audio').evaluate(a=>a.dataset.continuity='retained');
  await ap.getByRole('link',{name:'Local catalogue test',exact:true}).click();await ap.waitForURL(`**/catalogue/${track.id}`);
  assert.equal(await ap.locator('.music-player audio').getAttribute('data-continuity'),'retained');
  assert.equal(await ap.locator('.music-player audio').evaluate(a=>a.paused),false);
  await ap.getByRole('link',{name:'Music',exact:true}).click();await ap.getByLabel('Search',{exact:true}).fill('Local catalogue');await ap.getByLabel('Mood',{exact:true}).selectOption('playful');
  await ap.getByRole('button',{name:'Find music',exact:true}).click();await ap.waitForURL('**/catalogue?*');await ap.getByRole('link',{name:'Local catalogue test',exact:true}).waitFor();
  assert.equal(await ap.locator('.music-player audio').getAttribute('data-continuity'),'retained');
  assert.equal(await ap.locator('.music-player audio').evaluate(a=>a.paused),false);
  await shot(ap,kind+'-catalogue-desktop');await ap.setViewportSize({width:390,height:844});assert.ok(await ap.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(ap,kind+'-catalogue-mobile');
  check('catalogue filters, track page and persistent player work across client navigation at desktop/mobile sizes');
  await lp.goto(base+'/playlists');await lp.getByLabel('Playlist title',{exact:true}).fill('My private test list');await lp.getByRole('button',{name:'Create private playlist'}).click();await lp.getByRole('link',{name:'My private test list',exact:true}).waitFor();
  const lists=await (await listener.request.get(base+'/api/playlists')).json(),list=lists[0];
  await lp.goto(base+`/catalogue/${track.id}`);await lp.getByRole('button',{name:'Add to playlist'}).click();await lp.getByRole('status').filter({hasText:'Added to your private playlist'}).waitFor();
  assert.equal((await anonymous.request.get(base+'/api/playlists')).status(),401);assert.equal((await owner.request.get(base+`/api/playlists/${list.id}`)).status(),404);
  await lp.getByRole('link',{name:'Playlists',exact:true}).click();await lp.getByRole('link',{name:'My private test list',exact:true}).click();await lp.getByRole('link',{name:'Local catalogue test',exact:true}).waitFor();
  check('private playlist create/add/list and cross-account denial work through authenticated routes');
  await lp.getByRole('link',{name:'Local catalogue test',exact:true}).click();await lp.getByText('Report this track',{exact:true}).click();await lp.getByLabel('Reason',{exact:true}).fill('Synthetic moderation test concern.');await lp.getByRole('button',{name:'Send report'}).click();await lp.getByRole('status').filter({hasText:'Report received'}).waitFor();
  await rp.goto(base+'/review');const flagged=rp.locator('.library-list li').filter({hasText:'Local catalogue test'});await flagged.getByText('Reported concern: Synthetic moderation test concern.').waitFor();
  await flagged.getByLabel('Review note',{exact:true}).fill('Removed for the synthetic test.');await flagged.getByRole('button',{name:'Save review'}).click();await flagged.waitFor({state:'detached'});
  assert.equal((await anonymous.request.get(base+`/api/catalogue/${track.id}/audio`)).status(),404);await lp.goto(base+`/playlists/${list.id}`);await lp.getByText('No available tracks in this playlist.',{exact:true}).waitFor();
  assert.deepEqual(await (await owner.request.get(base+`/api/library/${track.id}/audio`)).body(),wav);
  check('report/reject revokes public audio and playlist availability while preserving the private original');
  await post(owner,`/api/catalogue/${track.id}/submit`,{artist:'Test credit',description:'Synthetic resubmission',mood:'playful',consent:true});
  const pending=(await (await reviewer.request.get(base+'/api/catalogue/review')).json()).find(t=>t.id===track.id);
  assert.equal((await post(reviewer,`/api/catalogue/${track.id}/review`,{revision:pending.revision,decision:'approved',confirmed:true,note:'Synthetic resubmission test'})).status(),200);
  await op.goto(base+'/library');await op.getByRole('button',{name:'Withdraw from catalogue',exact:true}).click();await op.getByText('Status: withdrawn',{exact:true}).waitFor();
  assert.equal((await anonymous.request.get(base+`/api/catalogue/${track.id}/audio`)).status(),404);
  assert.equal((await post(owner,`/api/catalogue/${track.id}/submit`,{},)).status(),400);
  assert.equal((await owner.request.post(base+`/api/catalogue/${track.id}/withdraw`,{headers:{origin:'https://untrusted.example'}})).status(),403);
  check('owner withdrawal and mutation-origin checks preserve privacy without deleting account audio');
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);check('no application console errors, runtime exceptions or blank/error screens');
  await writeFile(join(output,'report.json'),JSON.stringify({status:'PASS',browser:kind,browser_version:browser.version(),node:process.version,checks,errors,consoleErrors,captureWarnings,expectedValidationErrors,public_audio_byte_difference:0,human_review:'NOT RUN - synthetic workflow decisions only',live_providers:'NOT RUN'},null,2));
}catch(error){for(let i=0;i<pages.length;i++)await shot(pages[i],`failure-${i}`).catch(()=>{});throw error;}
finally{
  if(users.length){const assets=(await pool.query('SELECT track_id FROM track_assets WHERE owner_id=ANY($1::text[])',[users])).rows;for(const {track_id} of assets)for(const prefix of ['uploads','masters'])await rm(join(process.env.DJAYVO_LOCAL_AUDIO_DIR,prefix,track_id+'.wav'),{force:true});await pool.query('DELETE FROM track_assets WHERE owner_id=ANY($1::text[])',[users]);await pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[users]);}
  await pool.end();await Promise.all(contexts.map(c=>c.close()));await browser.close();
}
