import '../scripts/env';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, cp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { createPool } from '../lib/database';
import { authOptions } from '../lib/auth-options';
import { readConfig } from '../lib/config';
import { migrate } from '../lib/migrations';
import { listTracks } from '../lib/library';
import { cleanupAuth } from '../lib/auth-cleanup';

test('isolated Postgres account lifecycle, schema safety and owner isolation', async t => {
  const base = readConfig();
  assert.equal(base.local, true, 'Integration tests require loopback Postgres and local email.');
  assert.ok(base.outbox, 'Tests never send real emails.');
  const admin = createPool(base.databaseURL);
  const name = `jamloom_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(base.databaseURL); url.pathname = `/${name}`;
  const folder = await mkdtemp(join(tmpdir(), 'jamloom-accounts-'));
  const config = { ...base, databaseURL: url.toString(), outbox: join(folder, 'mail') };
  const pool = createPool(config.databaseURL);
  try {
    await t.test('migrations apply once and match pinned Better Auth configuration', async () => {
      assert.deepEqual(await migrate(pool), (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort());
      assert.deepEqual(await migrate(pool), []);
      const planned = await getMigrations(authOptions(config, pool));
      assert.deepEqual(planned.toBeCreated, []);
      assert.deepEqual(planned.toBeAdded, []);
      assert.deepEqual(planned.toBeAddedIndexes, []);
      assert.deepEqual(planned.unsafeChanges, []);
    });
    await t.test('failed migration rolls back and changed applied SQL is rejected', async () => {
      const migrations = join(folder, 'migrations');
      await cp(new URL('../migrations/', import.meta.url), migrations, { recursive: true });
      const directory = pathToFileURL(`${migrations}/`);
      await writeFile(join(migrations, '9999_failure.sql'), 'CREATE TABLE rollback_probe (id int); SELECT missing_column FROM tracks;');
      await assert.rejects(migrate(pool, directory));
      assert.equal((await pool.query("SELECT to_regclass('rollback_probe') AS name")).rows[0].name, null);
      await rm(join(migrations, '9999_failure.sql'));
      await writeFile(join(migrations, '0002_tracks.sql'), '-- changed');
      await assert.rejects(migrate(pool, directory), /Applied migration changed/);
    });
    await t.test('expired auth cleanup is bounded, retryable and preserves active records and accounts', async () => {
      await pool.query(`INSERT INTO "user"(id,name,email,"emailVerified") VALUES('cleanup-user','Test','cleanup@example.com',true)`);
      await pool.query(`INSERT INTO session(id,token,"userId","expiresAt","updatedAt")
        SELECT 'old-session-'||n,'old-token-'||n,'cleanup-user',now()-interval '1 hour',now() FROM generate_series(1,1001) n`);
      await pool.query(`INSERT INTO verification(id,identifier,value,"expiresAt")
        SELECT 'old-code-'||n,'cleanup-test','synthetic',now()-interval '1 hour' FROM generate_series(1,1001) n`);
      await pool.query(`INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES('active-session','active-token','cleanup-user',now()+interval '1 day',now())`);
      await pool.query(`INSERT INTO verification(id,identifier,value,"expiresAt") VALUES('active-code','cleanup-test','synthetic',now()+interval '1 day')`);
      const locked=await pool.connect();
      try {
        await locked.query('BEGIN');
        await locked.query(`SELECT id FROM session WHERE id='old-session-1' FOR UPDATE`);
        assert.deepEqual(await cleanupAuth(pool),{session:500,verification:500});
        assert.equal((await pool.query(`SELECT count(*)::int n FROM session WHERE id='old-session-1'`)).rows[0].n,1);
        await locked.query('COMMIT');
      } finally {locked.release();}
      const concurrent=await Promise.all([cleanupAuth(pool),cleanupAuth(pool)]);
      assert.equal(concurrent.reduce((n,r)=>n+r.session,0),501);
      assert.equal(concurrent.reduce((n,r)=>n+r.verification,0),501);
      assert.deepEqual(await cleanupAuth(pool),{session:0,verification:0});
      assert.deepEqual((await pool.query('SELECT id FROM session')).rows,[{id:'active-session'}]);
      assert.deepEqual((await pool.query('SELECT id FROM verification')).rows,[{id:'active-code'}]);
      assert.equal((await pool.query(`SELECT count(*)::int n FROM "user" WHERE id='cleanup-user'`)).rows[0].n,1);
      await pool.query(`DELETE FROM "user" WHERE id='cleanup-user'`);
      await pool.query(`DELETE FROM verification WHERE id='active-code'`);
    });
    const auth = betterAuth(authOptions(config, pool));
    const password = 'Jamloom-local-test-password-719';
    let ip = 1;
    async function request(path: string, body?: object, cookie?: string, origin = config.baseURL, address?: string) {
      return auth.handler(new Request(`${config.baseURL}/api/auth${path}`, {
        method: body ? 'POST' : 'GET', headers: {
          'Content-Type': 'application/json', origin, 'x-real-ip': address ?? `192.0.2.${ip++}`,
          ...(cookie ? { cookie } : {}),
        }, body: body ? JSON.stringify(body) : undefined,
      }));
    }
    async function link(to: string, subject: string) {
      const files = await readdir(config.outbox);
      const messages = await Promise.all(files.sort().map(async file => JSON.parse(await readFile(join(config.outbox, file), 'utf8'))));
      const mail = messages.findLast(message => message.to === to && message.subject.includes(subject));
      assert.ok(mail, 'Expected locally captured email');
      return mail.text.match(/https?:\/\/\S+/)[0] as string;
    }
    async function signup(email: string) {
      const response = await request('/sign-up/email', { email, password, name: 'Local listener', callbackURL: '/account/sign-in' });
      assert.equal(response.status, 200);
      assert.ok(!response.headers.get('set-cookie')?.includes('session_token'));
      const verification = await link(email, 'Verify');
      const response2 = await auth.handler(new Request(verification));
      assert.equal(response2.status, 302);
      const login = await request('/sign-in/email', { email, password });
      assert.equal(login.status, 200);
      const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      const user = (await login.json()).user;
      return { cookie, id: user.id, email };
    }
    await t.test('unverified accounts cannot sign in; verification and origin checks work', async () => {
      const email = 'unverified@example.com';
      assert.equal((await request('/sign-up/email', { email, password, name: 'Pending' })).status, 200);
      assert.equal((await request('/sign-in/email', { email, password })).status, 403);
      assert.equal((await request('/sign-up/email', { email: 'oversized@example.com', password, name: 'x'.repeat(81) })).status, 400);
      assert.equal((await request('/sign-up/email', { email: 'foreign@example.com', password, name: 'Foreign' }, undefined, 'https://other.example')).status, 403);
      assert.equal((await request('/request-password-reset', { email, redirectTo: 'https://other.example/' })).status, 403);
      assert.equal((await request('/verify-email?token=invalid')).status, 401);
    });
    const alice = await signup('alice@example.com');
    const bob = await signup('bob@example.com');
    await t.test('session cookies are validated; library pages isolate owners including cursor ties', async () => {
      const session = await auth.api.getSession({ headers: new Headers({ cookie: alice.cookie }) });
      assert.equal(session?.user.id, alice.id);
      assert.equal((await request('/update-user', { name: 'x'.repeat(81) }, alice.cookie)).status, 400);
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: 'better-auth.session_token=forged' }) }), null);
      await pool.query(`INSERT INTO tracks (owner_id, title, strategy, duration_ms, created_at)
        SELECT $1, 'Alice ' || n, 'club', 36000, '2026-10-18T12:00:00Z' FROM generate_series(1,55) n`, [alice.id]);
      await pool.query("INSERT INTO tracks (owner_id, title, strategy, duration_ms) VALUES ($1, 'Bob private', 'hiphop', 32000)", [bob.id]);
      const first = await listTracks(pool, alice.id);
      const second = await listTracks(pool, alice.id, first.nextCursor!);
      assert.equal(first.tracks.length, 50); assert.equal(second.tracks.length, 5);
      assert.equal(new Set([...first.tracks, ...second.tracks].map(row => row.id)).size, 55);
      assert.equal((await listTracks(pool, bob.id)).tracks.length, 1);
      assert.equal((await listTracks(pool, "' OR 1=1 --")).tracks.length, 0);
      await pool.query('UPDATE tracks SET deleted_at = now() WHERE id = $1', [first.tracks[0].id]);
      assert.ok(!(await listTracks(pool, alice.id)).tracks.some(row => row.id === first.tracks[0].id));
      await assert.rejects(listTracks(pool, alice.id, 'malformed'));
    });
    await t.test('password reset revokes sessions; reset tokens cannot be replayed', async () => {
      assert.equal((await request('/request-password-reset', { email: alice.email, redirectTo: '/account/reset-password' })).status, 200);
      const reset = await auth.handler(new Request(await link(alice.email, 'Reset')));
      const target = new URL(reset.headers.get('location')!, config.baseURL);
      const token = target.searchParams.get('token'); assert.ok(token);
      const newPassword = `${password}-new`;
      assert.equal((await request('/reset-password', { token, newPassword })).status, 200);
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: alice.cookie }) }), null);
      assert.equal((await request('/reset-password', { token, newPassword })).status, 400);
      assert.equal((await request('/sign-in/email', { email: alice.email, password })).status, 401);
      assert.equal((await request('/sign-in/email', { email: alice.email, password: newPassword })).status, 200);
    });
    await t.test('sign-out and expiration revoke access; password hashes are not plaintext', async () => {
      assert.equal((await request('/sign-out', {}, bob.cookie)).status, 200);
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: bob.cookie }) }), null);
      const login = await request('/sign-in/email', { email: bob.email, password });
      const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      await pool.query('UPDATE session SET "expiresAt" = now() - interval \'1 hour\' WHERE "userId" = $1', [bob.id]);
      assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
      const hashed = (await pool.query('SELECT password FROM account WHERE "userId" = $1', [bob.id])).rows[0].password;
      assert.notEqual(hashed, password); assert.ok(hashed.length > 64);
    });
    await t.test('database-backed rate limits survive multiple auth instances', async () => {
      for (let n = 0; n < 3; n++) await request('/request-password-reset', { email: 'absent@example.com' }, undefined, config.baseURL, '198.51.100.44');
      const second = betterAuth(authOptions(config, pool));
      const blocked = await second.handler(new Request(`${config.baseURL}/api/auth/request-password-reset`, {
        method: 'POST', headers: { origin: config.baseURL, 'x-real-ip': '198.51.100.44', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'absent@example.com' }),
      }));
      assert.equal(blocked.status, 429);
      const retryAfter = Number(blocked.headers.get('x-retry-after'));
      assert.ok(retryAfter > 0 && retryAfter <= 60, `Invalid retry delay: ${retryAfter}`);
      const concurrent = await Promise.all(Array.from({ length: 10 }, () => request('/request-password-reset',
        { email: 'absent@example.com' }, undefined, config.baseURL, '198.51.100.45')));
      assert.equal(concurrent.filter(response => response.status === 200).length, 3);
      assert.equal(concurrent.filter(response => response.status === 429).length, 7);
    });
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
    await rm(folder, { recursive: true, force: true });
  }
});
