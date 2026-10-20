import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { renderEmail } from '../lib/email-template';
import { readConfig } from '../lib/config';
import { authOptions } from '../lib/auth-options';

test('shared email layout escapes content and preserves a safe exact action URL', () => {
  const url = 'https://jamloom.com/api/auth/verify-email?token=fixture&callbackURL=%2Faccount';
  const message = { to: 'listener@example.com', subject: '<img src=x onerror=alert(1)>',
    text: '<script>bad()</script> & "quoted"', action: { label: 'Verify <email>', url } };
  const email = renderEmail({ baseURL: 'https://jamloom.com' }, message);
  assert(!email.html.includes('<script>'));
  assert(!email.html.includes('<img src=x'));
  assert.match(email.html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(email.html, /Verify &lt;email&gt;/);
  assert(email.html.includes('token=fixture&amp;callbackURL=%2Faccount'));
  assert(email.text.includes(url));
  assert(email.text.includes('support@jamloom.com'));
  assert(email.html.includes('/studio/icon-192.png'));
  for (const unsafe of ['javascript:alert(1)', 'https://evil.example/reset', 'https://jamloom.com.evil.example/reset', 'https://user:password@jamloom.com/reset']) {
    assert.throws(() => renderEmail({ baseURL: 'https://jamloom.com' }, { ...message, action: { label: 'Go', url: unsafe } }));
  }
  const generic = renderEmail({ baseURL: 'https://jamloom.com' }, { to: message.to, subject: 'An update', text: 'Your music is ready.' });
  assert(generic.html.includes('mailto:contact@jamloom.com'));
  assert(!generic.html.includes('If the button'));
});

test('both actual auth callbacks capture branded HTML and plain text in the private outbox', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'jamloom-email-'));
  const config = readConfig({ DATABASE_URL: 'postgresql://test:test@localhost/test',
    BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'a'.repeat(48), JAMLOOM_LOCAL_OUTBOX: directory });
  const pool = new Pool({ connectionString: config.databaseURL });
  try {
    const options = authOptions(config, pool);
    const user = { id: 'fixture', email: 'listener@example.com', name: 'Listener', emailVerified: false,
      createdAt: new Date(), updatedAt: new Date() };
    await options.emailVerification!.sendVerificationEmail!({ user, url: config.baseURL + '/api/auth/verify-email?token=verify-fixture', token: 'verify-fixture' });
    await options.emailAndPassword!.sendResetPassword!({ user, url: config.baseURL + '/account/reset-password?token=reset-fixture', token: 'reset-fixture' });
    const messages = await Promise.all((await readdir(directory)).map(async file => JSON.parse(await readFile(join(directory, file), 'utf8'))));
    assert.equal(messages.length, 2);
    for (const message of messages) {
      const reset = message.subject.includes('Reset');
      assert(message.html.includes(reset ? 'Reset password' : 'Verify email'));
      assert(message.html.includes('jamloom</a>'));
      assert(message.html.includes('mailto:support@jamloom.com'));
      assert(message.text.match(/https?:\/\/\S+/)[0].includes(reset ? 'token=reset-fixture' : 'token=verify-fixture'));
    }
  } finally { await pool.end(); await rm(directory, { recursive: true, force: true }); }
});
