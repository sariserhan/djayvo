import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { chromium, webkit } from 'playwright';

process.loadEnvFile('.env.local');
const base = process.env.BETTER_AUTH_URL;
const dbURL = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(dbURL.hostname), 'Browser tests require loopback Postgres.');
assert.ok((process.env.JAMLOOM_LOCAL_OUTBOX ?? process.env.DJAYVO_LOCAL_OUTBOX), 'Browser tests never send real email.');
assert.equal(new URL(base).hostname, 'localhost');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = await mkdtemp(join(root, 'renders/site-validation-'));
console.log(`Evidence: ${output}`);
const pool = new Pool({ connectionString: dbURL.toString() });
const kind = (process.env.JAMLOOM_BROWSER ?? process.env.DJAYVO_BROWSER) || 'chromium';
const browser = await (kind === 'webkit' ? webkit : chromium).launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
  extraHTTPHeaders: { 'x-real-ip': `198.51.100.${10 + Math.floor(Math.random() * 200)}` } });
const page = await context.newPage();
const errors = [], consoleErrors = [], captureWarnings = [], checks = [], requests = [];
let capturing=false;
async function screenshot(options) {
  capturing=true;
  try { return await page.screenshot({caret:'initial',...options}); }
  finally { capturing=false; }
}
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if(message.type()!=='error') return;
  // WebKit screenshot synchronization injects a temporary body {} style under the studio's strict CSP.
  if(kind==='webkit' && capturing && message.text().startsWith('Refused to apply a stylesheet because its hash, its nonce,')) captureWarnings.push(message.text());
  else consoleErrors.push(message.text());
});
context.on('request', request => requests.push({ method: request.method(), url: request.url().split('?')[0] }));
const check = name => { checks.push({ name, status: 'PASS' }); console.log(`PASS: ${name}`); };
const email = `browser-${randomUUID()}@example.com`;
const other = `browser-${randomUUID()}@example.com`;
const password = 'Jamloom-browser-passphrase-719';
async function capturedLink(subject) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const files = await readdir((process.env.JAMLOOM_LOCAL_OUTBOX ?? process.env.DJAYVO_LOCAL_OUTBOX)).catch(() => []);
    const messages = await Promise.all(files.sort().map(async name => JSON.parse(await readFile(join((process.env.JAMLOOM_LOCAL_OUTBOX ?? process.env.DJAYVO_LOCAL_OUTBOX), name), 'utf8'))));
    const mail = messages.findLast(item => item.to === email && item.subject.includes(subject));
    if (mail) return mail.text.match(/https?:\/\/\S+/)[0];
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Expected email was not captured.');
}
async function signIn(pass = password) {
  await page.goto(`${base}/account/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/account`);
}
try {
  await page.goto(base);
  await page.waitForURL('**/studio/index.html');
  assert.equal(await page.locator('#record').isDisabled(), true);
  await page.locator('#consent').check();
  await page.locator('#file').setInputFiles(join(root, 'renders/fixtures/synthetic-speech.wav'));
  await page.waitForFunction(() => !document.querySelector('#generate').disabled);
  await page.locator('input[value=club]').check();
  await page.locator('#generate').click();
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 1, { timeout: 90000 });
  const audio = page.locator('.track audio');
  await audio.evaluate(async player => { player.muted = true; await player.play(); });
  await page.waitForFunction(() => document.querySelector('.track audio').currentTime > 0.1);
  await audio.evaluate(player => player.pause());
  const downloaded=page.waitForEvent('download');
  await page.locator('.track .download').click();
  const mixPath=join(output,'local-mix.wav');
  await (await downloaded).saveAs(mixPath);
  assert.ok(!requests.some(request => request.method === 'POST'));
  await screenshot({ path: join(output, `${kind}-studio.png`), fullPage: true });
  check('anonymous consent/import/club generation/playback stay local through Next hosting');
  const anon = await context.request.get(`${base}/api/library`);
  assert.equal(anon.status(), 401);
  assert.match(anon.headers()['cache-control'], /no-store/);
  const forged = await context.request.get(`${base}/api/library`, { headers: { cookie: 'better-auth.session_token=forged' } });
  assert.equal(forged.status(), 401);
  check('anonymous and forged-cookie API access denied without caching');
  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Local test listener');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
  assert.equal((await context.request.get(`${base}/api/library`)).status(), 401);
  await page.goto(await capturedLink('Verify'));
  await signIn();
  await page.getByRole('heading', { name: 'Your account.' }).waitFor();
  check('real browser registration, verification and password sign-in');
  const user = (await pool.query('SELECT id FROM "user" WHERE email = $1', [email])).rows[0];
  await pool.query('INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, true)', [other, 'Other listener', other]);
  await pool.query("INSERT INTO tracks (owner_id, title, strategy, duration_ms) VALUES ($1, 'Your test track', 'club', 36000), ($2, 'Other private track', 'club', 36000)", [user.id, other]);
  await page.getByRole('link', { name: 'Cloud library', exact: true }).first().click();
  await page.getByText('Your test track', { exact: true }).waitFor();
  assert.equal(await page.getByText('Other private track', { exact: true }).count(), 0);
  const library = await context.request.get(`${base}/api/library`);
  assert.equal(library.status(), 200);
  assert.deepEqual((await library.json()).tracks.map(track => track.title), ['Your test track']);
  assert.equal((await context.request.get(`${base}/api/library?ownerId=${other}`)).status(), 400);
  assert.equal((await context.request.get(`${base}/api/library?cursor=invalid`)).status(), 400);
  check('server-rendered library and API exclude another owner; spoofed owner/cursor rejected');
  if ((process.env.JAMLOOM_LOCAL_AUDIO_DIR ?? process.env.DJAYVO_LOCAL_AUDIO_DIR)) {
    assert.match(await page.title(),/Jamloom/);
    await page.getByLabel('Mix title',{exact:true}).fill('Private browser mix');
    await page.getByLabel('Musical direction',{exact:true}).selectOption('club');
    await page.getByLabel('Finished WAV',{exact:true}).setInputFiles(mixPath);
    await page.getByRole('button',{name:'Save privately',exact:true}).click();
    assert.equal((await pool.query('SELECT count(*)::int n FROM track_assets WHERE owner_id=$1',[user.id])).rows[0].n,0);
    await page.getByLabel('I have permission to store this mix online, including any recognizable voices.',{exact:true}).check();
    await page.getByRole('button',{name:'Save privately',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Saved privately'}).waitFor();
    const track=page.locator('.library-list li').filter({hasText:'Private browser mix'});
    await track.waitFor();
    const stored=(await (await context.request.get(`${base}/api/library`)).json()).tracks.find(t=>t.title==='Private browser mix');
    const response=await context.request.get(`${base}/api/library/${stored.id}/audio`);
    assert.equal(response.status(),200);assert.match(response.headers()['cache-control'],/no-store/);
    assert.deepEqual(await response.body(),await readFile(mixPath));
    const range=await context.request.get(`${base}/api/library/${stored.id}/audio`,{headers:{range:'bytes=44-99'}});
    assert.equal(range.status(),206);assert.deepEqual(await range.body(),(await readFile(mixPath)).subarray(44,100));
    const invalidRange=await context.request.get(`${base}/api/library/${stored.id}/audio`,{headers:{range:'bytes=99999999-'}});assert.equal(invalidRange.status(),416);
    const player=track.locator('audio');
    await player.evaluate(async a=>{a.muted=true;await a.play();});
    await page.waitForFunction(()=>document.querySelector('.track-actions audio')?.currentTime>.1);
    await player.evaluate(a=>{a.pause();a.currentTime=8;});
    await page.waitForFunction(()=>document.querySelector('.track-actions audio')?.currentTime>=7.9);
    const download=page.waitForEvent('download');await track.getByRole('link',{name:'Download WAV'}).click();
    const savedPath=join(output,'account-mix.wav');await (await download).saveAs(savedPath);
    assert.deepEqual(await readFile(savedPath),await readFile(mixPath));
    check('explicit voice-storage consent, private save, checksum-identical playback/download and byte-range seek');
    await screenshot({path:join(output,`${kind}-library-desktop.png`),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await screenshot({path:join(output,`${kind}-library-mobile.png`),fullPage:true});
    assert.equal((await context.request.post(`${base}/api/library/${stored.id}/finalize`,{headers:{origin:'https://untrusted.example'}})).status(),403);
    await track.getByRole('button',{name:'Remove from account',exact:true}).click();
    await track.getByRole('button',{name:'Keep mix',exact:true}).click();
    assert.equal((await context.request.get(`${base}/api/library/${stored.id}/audio`)).status(),200);
    await track.getByRole('button',{name:'Remove from account',exact:true}).click();
    await track.getByRole('button',{name:'Confirm removal',exact:true}).click();
    await track.waitFor({state:'detached'});
    assert.equal((await context.request.get(`${base}/api/library/${stored.id}/audio`)).status(),404);
    assert.equal((await pool.query('SELECT state FROM track_assets WHERE track_id=$1',[stored.id])).rows[0].state,'deleting');
    check('responsive private library, cancellation of removal, immediate access revocation and queued cleanup');
    await page.setViewportSize({width:1440,height:1000});
  }
  const oversized = await context.request.post(`${base}/api/auth/sign-up/email`, { data: { email, name: 'x'.repeat(17000), password }, headers: { origin: base } });
  assert.equal(oversized.status(), 413);
  const crossOrigin = await context.request.post(`${base}/api/auth/sign-out`, { data: {}, headers: { origin: 'https://untrusted.example' } });
  assert.equal(crossOrigin.status(), 403);
  check('oversized auth body and cross-origin state change denied');
  await page.goto(`${base}/account/forgot-password`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
  await page.goto(await capturedLink('Reset'));
  await page.getByLabel('Password', { exact: true }).fill(`${password}-new`);
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByRole('status').filter({ hasText: 'Password updated' }).waitFor();
  assert.equal((await context.request.get(`${base}/api/library`)).status(), 401);
  await signIn(`${password}-new`);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('**/account/sign-in');
  assert.equal((await context.request.get(`${base}/api/library`)).status(), 401);
  check('browser password reset revokes session; new password and sign-out work');
  await screenshot({ path: join(output, `${kind}-account-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot({ path: join(output, `${kind}-account-mobile.png`), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('link', { name: 'Back to the studio', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 1);
  assert.equal(await page.locator('#consent').isChecked(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('mobile layout fits; local mix survives account navigation and sign-out');
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  check('no browser runtime exceptions');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(output, `${kind}-report.json`), JSON.stringify({ browser: kind, browser_version:browser.version(),node:process.version,status: 'PASS', checks,
    live_neon: 'NOT RUN', live_resend: 'NOT RUN',live_r2:'NOT RUN',physical_microphone: 'NOT RUN', human_listening: 'NOT RUN', errors,consoleErrors,captureWarnings }, null, 2));
} catch(error) {
  await screenshot({path:join(output,`${kind}-failure.png`),fullPage:true}).catch(()=>{});
  console.error(await page.locator('body').innerText().catch(()=>''));
  throw error;
} finally {
  const assets=(await pool.query('SELECT a.track_id FROM track_assets a JOIN "user" u ON u.id=a.owner_id WHERE u.email=ANY($1::text[])',[[email,other]])).rows;
  for(const {track_id} of assets) if((process.env.JAMLOOM_LOCAL_AUDIO_DIR ?? process.env.DJAYVO_LOCAL_AUDIO_DIR)) {
    for(const prefix of ['uploads','masters']) await rm(join((process.env.JAMLOOM_LOCAL_AUDIO_DIR ?? process.env.DJAYVO_LOCAL_AUDIO_DIR),prefix,`${track_id}.wav`),{force:true});
  }
  await pool.query('DELETE FROM track_assets WHERE owner_id IN (SELECT id FROM "user" WHERE email=ANY($1::text[]))',[[email,other]]);
  await pool.query('DELETE FROM "user" WHERE email = ANY($1::text[])', [[email, other]]);
  await pool.end(); await context.close(); await browser.close();
}
