import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { Pool } from 'pg';
import { readConfig } from '../lib/config';
import { authOptions } from '../lib/auth-options';
import { audioStore } from '../lib/audio-store';
import { sendEmail } from '../lib/email';
import { boundedAuthRequest } from '../lib/bounded-request';

const local = {
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:55439/jamloom_test',
  BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'a'.repeat(48),
  JAMLOOM_LOCAL_OUTBOX: '/tmp/jamloom-test-outbox',
};
test('production template binds auth and private R2 grants to Jamloom configuration', async () => {
  const template = parseEnv(readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8'));
  assert.equal(template.JAMLOOM_R2_ENABLED, 'false');
  assert.equal(template.JAMLOOM_CATALOGUE_ENABLED, 'false');
  assert.throws(() => readConfig(template));
  const env = { ...template, DATABASE_URL: 'postgresql://u:p@ep-example.neon.tech/db',
    BETTER_AUTH_SECRET: 'a'.repeat(48), RESEND_API_KEY: 'test-key', EMAIL_FROM: 'Jamloom <hello@jamloom.com>',
    R2_ACCOUNT_ID: 'a'.repeat(32), R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret', VERCEL: '1' };
  const config = readConfig(env);
  assert.equal(config.baseURL, 'https://jamloom.com');
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    assert.deepEqual(authOptions(config, pool).trustedOrigins, ['https://jamloom.com']);
    assert.equal(audioStore(config, env), null);
    const store = audioStore(config, { ...env, JAMLOOM_R2_ENABLED: 'true' })!;
    const grant = new URL(await store.uploadURL('uploads/test.wav', 3840044, 120));
    assert.equal(grant.hostname, `jamloom-audio.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    const [cors] = JSON.parse(readFileSync(new URL('../config/r2-cors.production.json', import.meta.url), 'utf8'));
    assert.deepEqual(cors.AllowedOrigins, [config.baseURL]);
    assert.deepEqual(cors.AllowedMethods, ['GET', 'PUT', 'HEAD']);
    assert.ok(cors.AllowedHeaders.includes('Range'));
  } finally { await pool.end(); }
});
test('account configuration fails closed and forbids hosted development mail', () => {
  assert.throws(() => readConfig({}));
  assert.throws(() => readConfig({ ...local, BETTER_AUTH_SECRET: 'short' }));
  assert.throws(() => readConfig({ ...local, BETTER_AUTH_URL: 'https://jamloom.example' }));
  assert.throws(() => readConfig({ ...local, VERCEL: '1' }));
  assert.throws(() => readConfig({ ...local, BETTER_AUTH_URL: 'http://localhost:3000/redirect' }));
  assert.equal(readConfig(local).local, true);
  const hosted = { ...local, JAMLOOM_LOCAL_OUTBOX: undefined, DATABASE_URL: 'postgresql://user:pass@ep-example.neon.tech/db', BETTER_AUTH_URL: 'https://jamloom.example', RESEND_API_KEY: 'test-key', EMAIL_FROM: 'Jamloom <hello@example.com>' };
  assert.equal(readConfig(hosted).local, false);
  assert.throws(() => readConfig({ ...hosted, JAMLOOM_LOCAL_OUTBOX: '/tmp/outbox' }));
  assert.throws(() => readConfig({ ...hosted, BETTER_AUTH_URL: 'http://jamloom.example' }));
});
test('Resend request uses server credentials, timeout and deterministic retry identity', async () => {
  const config = { ...readConfig(local), local: false, outbox: undefined, resendKey: 'test-key', emailFrom: 'Jamloom <hello@example.com>' };
  const mail = { to: 'listener@example.com', subject: 'Verify', text: 'A test link' };
  const requests: Request[] = [];
  const fakeFetch: typeof fetch = async (url, options) => {
    const request = new Request(url, options); requests.push(request);
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.headers.get('authorization'), 'Bearer test-key');
    assert.deepEqual(await request.json(), { from: config.emailFrom, to: [mail.to], subject: mail.subject, text: mail.text });
    return Response.json({ id: 'local-test' });
  };
  await sendEmail(config, mail, fakeFetch); await sendEmail(config, mail, fakeFetch);
  assert.equal(requests[0].headers.get('idempotency-key'), requests[1].headers.get('idempotency-key'));
  await assert.rejects(sendEmail(config, mail, async () => new Response('private provider error', { status: 429 })), /delivery failed \(429\)/);
});
test('localhost can use Neon without enabling local database/storage shortcuts', () => {
  const remote = { ...local, DATABASE_URL: 'postgresql://user:pass@ep-example-pooler.neon.tech/db' };
  const config = readConfig(remote);
  assert.equal(config.localApp, true);
  assert.equal(config.local, false);
  assert.equal(config.outbox, local.JAMLOOM_LOCAL_OUTBOX);
  assert.throws(() => readConfig({ ...remote, VERCEL: '1' }));
  assert.throws(() => readConfig({ ...remote, BETTER_AUTH_URL: 'https://jamloom.example' }));
  assert.throws(() => readConfig({ ...remote, DATABASE_URL: 'postgresql://u:p@untrusted.example/db' }));
});
test('email outbox cannot run in a hosted app even if a config is supplied directly', async () => {
  await assert.rejects(sendEmail({ ...readConfig(local), localApp: false },
    { to: 'test@example.com', subject: 'Test', text: 'Test' }), /disabled/);
});
test('auth body limit measures real streamed bytes rather than trusting Content-Length', async () => {
  const small = new Request('http://localhost/api/auth/sign-in/email', { method: 'POST', body: '{"email":"test@example.com"}' });
  assert.equal(await (await boundedAuthRequest(small))!.text(), '{"email":"test@example.com"}');
  const oversized = new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST', headers: { 'Content-Length': '1' }, body: 'x'.repeat(16_385),
  });
  assert.equal(await boundedAuthRequest(oversized), null);
});

test('Jamloom config accepts legacy deployment keys and gives explicit new values priority', () => {
  const legacy = { ...local, JAMLOOM_LOCAL_OUTBOX: undefined, DJAYVO_LOCAL_OUTBOX: '/tmp/legacy-outbox' };
  assert.equal(readConfig(legacy).outbox, '/tmp/legacy-outbox');
  assert.equal(readConfig({ ...legacy, JAMLOOM_LOCAL_OUTBOX: '/tmp/new-outbox' }).outbox, '/tmp/new-outbox');
  assert.throws(() => readConfig({ ...legacy, JAMLOOM_LOCAL_OUTBOX: '' }), /Resend/);
  assert.throws(() => readConfig({ ...legacy, VERCEL: '1', BETTER_AUTH_URL: 'https://jamloom.example', DATABASE_URL: 'postgresql://u:p@ep-example.neon.tech/db' }), /forbidden/);
});
