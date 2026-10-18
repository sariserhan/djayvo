import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from './config';

export type AccountEmail = { to: string; subject: string; text: string };

export async function sendEmail(config: Config, message: AccountEmail, send = fetch) {
  if (config.outbox) {
    if (!config.local) throw new Error('Local email transport is disabled.');
    await mkdir(config.outbox, { recursive: true, mode: 0o700 });
    await writeFile(join(config.outbox, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify(message), { mode: 0o600, flag: 'wx' });
    return;
  }
  const response = await send('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json',
      'Idempotency-Key': createHash('sha256').update(JSON.stringify(message)).digest('hex'),
    },
    body: JSON.stringify({ from: config.emailFrom, to: [message.to], subject: message.subject, text: message.text }),
  });
  // Never log provider bodies, email addresses or verification/reset links.
  if (!response.ok) throw new Error(`Account email delivery failed (${response.status}).`);
}
