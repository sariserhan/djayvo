import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { chromium, webkit } from 'playwright';
import { readConfig } from '../lib/config';
import { authOptions } from '../lib/auth-options';
import { sendEmail } from '../lib/email';

const output = new URL('../../../docs/evidence/email-templates/', import.meta.url);
await mkdir(new URL('previews/', output), { recursive: true });
const config = readConfig({ DATABASE_URL: 'postgresql://fixture:fixture@ep-fixture.neon.tech/test',
  BETTER_AUTH_URL: 'https://jamloom.com', BETTER_AUTH_SECRET: 'fixture'.repeat(8),
  RESEND_API_KEY: 'fixture-never-sent', EMAIL_FROM: 'Jamloom <hello@jamloom.com>', EMAIL_REPLY_TO: 'support@jamloom.com' });
const captured: { subject: string; html: string; text: string }[] = [];
const originalFetch = globalThis.fetch;
const pool = new Pool({ connectionString: config.databaseURL });
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    captured.push(JSON.parse(options!.body as string));
    return Response.json({ id: 'preview-only-no-email-sent' });
  };
  const options = authOptions(config, pool);
  const user = { id: 'preview', email: 'listener@example.com', name: 'Listener', emailVerified: false, createdAt: new Date(), updatedAt: new Date() };
  await options.emailVerification!.sendVerificationEmail!({ user, token: 'preview-only', url: 'https://jamloom.com/api/auth/verify-email?token=preview-only&callbackURL=%2Faccount' });
  await options.emailAndPassword!.sendResetPassword!({ user, token: 'preview-only', url: 'https://jamloom.com/account/reset-password?token=preview-only' });
  await sendEmail(config, { to: user.email, subject: 'Long content check ' + 'unbroken'.repeat(30),
    text: ('A long message must keep its footer, readable text and working links. ' + 'word'.repeat(100) + '\n\n').repeat(12),
    action: { label: 'Open your account', url: 'https://jamloom.com/account?preview=' + 'a'.repeat(1500) } });
} finally { globalThis.fetch = originalFetch; await pool.end(); }
const names = ['verify', 'reset', 'long-content'];
for (const [index, mail] of captured.entries()) {
  await writeFile(new URL(`previews/${names[index]}.html`, output), mail.html.replace('src="https://jamloom.com/studio/icon-192.png"', 'src="studio/icon-192.png"'));
  await writeFile(new URL(`previews/${names[index]}.txt`, output), mail.text);
}
await writeFile(new URL('previews/index.html', output), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom email previews</title><body style="background:#101211;color:#f0f3eb;font:18px/1.6 system-ui;padding:24px"><h1>Jamloom email previews</h1><p>Sample links only. No email sent.</p>' + names.map(name => `<p><a style="color:#c3ef69" href="${name}.html">${name}</a></p>`).join('') + '</body></html>');
const icon = await readFile(new URL('../../web/icon-192.png', import.meta.url));
// Make previews standalone so they can be served locally without contacting production.
await mkdir(new URL('previews/studio/', output), { recursive: true });
await writeFile(new URL('previews/studio/icon-192.png', output), icon);
const reports = [];
for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    let blockImages = false;
    await page.route('**/*', route => route.request().url() === 'https://jamloom.com/studio/icon-192.png' && !blockImages
      ? route.fulfill({ contentType: 'image/png', body: icon }) : route.abort());
    for (const [index, mail] of captured.entries()) {
      const modes = [
        { name: 'narrow', width: 200, height: 300 }, { name: 'small', width: 320, height: 568 },
        { name: 'mobile', width: 390, height: 844 }, { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1440, height: 900 }, { name: 'landscape', width: 812, height: 375 },
        { name: 'images-blocked', width: 320, height: 568 }, { name: 'large-text', width: 320, height: 568 },
        { name: 'inline-only', width: 320, height: 568 },
      ];
      for (const mode of modes) {
        blockImages = mode.name === 'images-blocked';
        await page.setViewportSize({ width: mode.width, height: mode.height });
        await page.setContent(blockImages ? mail.html.replace('icon-192.png', 'icon-192.png?blocked') : mail.html, { waitUntil: 'networkidle' });
        if (mode.name === 'large-text') await page.evaluate(() => {
          const sizes = Array.from(document.querySelectorAll<HTMLElement>('h1,p,a'), element => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
          for (const { element, size } of sizes) element.style.fontSize = size * 2 + 'px';
          for (const element of document.querySelectorAll<HTMLElement>('h1,p,a')) element.style.lineHeight = '1.5';
        });
        if (mode.name === 'inline-only') await page.locator('style').evaluateAll(elements => elements.forEach(e => e.remove()));
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        assert(width <= mode.width + 1, `${engineName}/${names[index]}/${mode.name}: horizontal overflow ${width}`);
        assert.equal(await page.locator('h1').textContent(), mail.subject);
        assert(await page.locator('a[aria-label="Jamloom home"]').isVisible());
        const footer = page.getByRole('link', { name: 'General enquiries', exact: true });
        await footer.scrollIntoViewIfNeeded(); assert(await footer.isVisible());
        const action = page.getByRole('link', { name: index === 0 ? 'Verify email' : index === 1 ? 'Reset password' : 'Open your account', exact: true });
        assert((await action.boundingBox())!.height >= 44);
        assert((await action.getAttribute('href'))!.startsWith('https://jamloom.com/'));
        if (mode.name === 'images-blocked') assert.equal(await page.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth), 0);
        if (engineName === 'chromium' && index < 2 && ['mobile', 'desktop'].includes(mode.name)) {
          await page.screenshot({ path: new URL(`${names[index]}-${mode.name}.png`, output).pathname, fullPage: true });
        }
        reports.push({ engine: engineName, version: browser.version(), template: names[index], mode: mode.name, width: mode.width, height: mode.height, status: 'PASS' });
      }
    }
  } finally { await browser.close(); }
}
await writeFile(new URL('browser.json', output), JSON.stringify({ status: 'PASS', cases: reports.length,
  scope: 'Browser layout checks, not Gmail/Outlook/Apple Mail inbox rendering.', results: reports }, null, 2) + '\n');
console.log(`PASS: ${reports.length} browser/layout cases; previews and screenshots in docs/evidence/email-templates.`);
