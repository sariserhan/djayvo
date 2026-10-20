import '../scripts/env.ts';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createRateLimitKey, normalizeIP } from '@better-auth/core/utils/ip';
import { createPool } from '../lib/database.ts';
import { readConfig } from '../lib/config.ts';

// This test writes only uniquely named synthetic records, then removes them.
const config = readConfig();
const target = new URL(config.databaseURL);
assert.ok(config.localApp && !config.local && config.outbox, 'Requires localhost + Neon + local email outbox.');
assert.equal((process.env.JAMLOOM_NEON_TEST_TARGET ?? process.env.DJAYVO_NEON_TEST_TARGET), target.host + target.pathname,
  'Set JAMLOOM_NEON_TEST_TARGET to the intended Neon host/database before running.');
assert.ok(target.hostname.includes('-pooler.'), 'Use the pooled application URL.');
assert.ok(!(process.env.JAMLOOM_LOCAL_AUDIO_DIR ?? process.env.DJAYVO_LOCAL_AUDIO_DIR) && (process.env.JAMLOOM_R2_ENABLED ?? process.env.DJAYVO_R2_ENABLED) !== 'true',
  'Database smoke test must not upload audio.');
const pool = createPool(config.databaseURL);
const output = await mkdtemp(join(tmpdir(), 'jamloom-neon-'));
console.log(`Screenshots: ${output}`);
const run = randomUUID();
const email = `neon-${run}@example.com`, other = `neon-other-${run}@example.com`;
const password = `Jamloom-${randomUUID()}`;
const ip = `2001:db8:${randomInt(65536).toString(16)}:${randomInt(65536).toString(16)}::1`;
const paths = new Set();
const mailFiles = new Set();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { 'x-real-ip': ip } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
context.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/api/auth/')) paths.add(url.pathname.slice('/api/auth'.length));
});
const pass = name => console.log(`PASS: ${name}`);
try {
  assert.equal((await pool.query('select current_database() as name')).rows[0].name, target.pathname.slice(1));
  assert.equal((await pool.query('select count(*)::int n from djayvo_migrations')).rows[0].n, 5);
  pass('live pooled Neon connection and five applied migrations');
  await page.goto(config.baseURL);
  await page.waitForURL('**/studio/index.html');
  assert.match(await page.title(), /Jamloom/);
  assert.equal(await page.locator('#record').isDisabled(), true);
  await page.locator('#consent').check();
  assert.equal(await page.locator('#record').isEnabled(), true);
  pass('studio loads and consent control responds');
  await page.goto(`${config.baseURL}/account/sign-up`);
  await page.getByLabel('Name', { exact: true }).fill('Neon smoke listener');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
  const user = (await pool.query('SELECT id,"emailVerified" FROM "user" WHERE email=$1', [email])).rows[0];
  assert.equal(user.emailVerified, false);
  assert.equal((await context.request.get(`${config.baseURL}/api/library`)).status(), 401);
  pass('browser registration persists an unverified account on Neon; anonymous library denied');
  let verification;
  for (let attempt = 0; attempt < 100 && !verification; attempt++) {
    for (const name of await readdir(config.outbox)) {
      const file = join(config.outbox, name);
      const message = JSON.parse(await readFile(file, 'utf8'));
      if (message.to === email) {
        mailFiles.add(file);
        if (message.subject.includes('Verify')) verification = message.text.match(/https?:\/\/\S+/)[0];
      }
    }
    if (!verification) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(verification, 'Local verification message arrived.');
  await page.goto(verification);
  await page.goto(`${config.baseURL}/account/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${config.baseURL}/account`);
  await page.getByRole('heading', { name: 'Your account.' }).waitFor();
  assert.equal((await pool.query('SELECT "emailVerified" FROM "user" WHERE id=$1', [user.id])).rows[0].emailVerified, true);
  assert.equal((await pool.query('SELECT count(*)::int n FROM session WHERE "userId"=$1', [user.id])).rows[0].n, 1);
  pass('local email verification and browser password sign-in create a Neon session');
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [other, 'Other synthetic listener', other]);
  await pool.query("INSERT INTO tracks(owner_id,title,strategy,duration_ms) VALUES($1,'Neon smoke private mix','club',32000),($2,'Other private mix','hiphop',30000)", [user.id, other]);
  await page.getByRole('link', { name: 'Cloud library', exact: true }).first().click();
  await page.getByText('Neon smoke private mix', { exact: true }).waitFor();
  assert.equal(await page.getByText('Other private mix', { exact: true }).count(), 0);
  await page.getByText('Account audio saving is not configured yet.', { exact: false }).waitFor();
  const response = await context.request.get(`${config.baseURL}/api/library`);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['cache-control'], /no-store/);
  assert.deepEqual((await response.json()).tracks.map(track => track.title), ['Neon smoke private mix']);
  assert.equal((await context.request.get(`${config.baseURL}/api/library?ownerId=${other}`)).status(), 400);
  pass('Next library page and API read Neon records with owner isolation and private caching');
  await page.screenshot({ path: join(output, 'library-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(output, 'library-mobile.png'), fullPage: true });
  pass('desktop/mobile library renders without horizontal overflow');
  await page.goto(`${config.baseURL}/account`);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(`${config.baseURL}/account/sign-in`);
  assert.equal((await context.request.get(`${config.baseURL}/api/library`)).status(), 401);
  assert.equal((await pool.query('SELECT count(*)::int n FROM session WHERE "userId"=$1', [user.id])).rows[0].n, 0);
  pass('browser sign-out removes Neon session and revokes library access');
  assert.deepEqual(errors, []);
  pass('no browser runtime or console errors');
} finally {
  await browser.close();
  try {
    await pool.query('DELETE FROM "user" WHERE email = ANY($1::text[])', [[email, other]]);
    const keys = [...paths].map(path => createRateLimitKey(normalizeIP(ip), path));
    await pool.query('DELETE FROM "rateLimit" WHERE key = ANY($1::text[])', [keys]);
    assert.equal((await pool.query('SELECT count(*)::int n FROM "rateLimit" WHERE key = ANY($1::text[])', [keys])).rows[0].n, 0);
    for (const file of mailFiles) await rm(file, { force: true });
    assert.equal((await pool.query('SELECT count(*)::int n FROM "user" WHERE email = ANY($1::text[])', [[email, other]])).rows[0].n, 0);
    pass('synthetic accounts, cascading tracks/sessions, test rate limits and captured email cleaned');
  } finally { await pool.end(); }
}
