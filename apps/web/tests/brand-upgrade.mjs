// Supply a pre-rename export to exercise the on-disk browser contract, not new save code.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, webkit } from 'playwright';

const [prefix, studio = 'http://localhost:3000/studio/'] = process.argv.slice(2);
assert.ok(prefix, 'Usage: node tests/brand-upgrade.mjs PRE_RENAME_EXPORT_PREFIX [STUDIO_URL]');
assert.equal(new URL(studio).hostname, 'localhost');
const kind = process.env.JAMLOOM_BROWSER ?? process.env.DJAYVO_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(kind));
const files = [];
for (const style of ['hiphop', 'reggae', 'experimental']) {
  for (const suffix of ['wav', 'score.json', 'report.json', 'events.tsv']) {
    const name = `${style}.${suffix}`, bytes = await readFile(`${prefix}.${name}`);
    if (suffix === 'report.json') assert.equal(JSON.parse(bytes).project, 'Djayvo');
    files.push({ name, base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
const output = await mkdtemp(join(tmpdir(), `jamloom-upgrade-${kind}-`));
const browser = await { chromium, webkit }[kind].launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const checks = [];
const pass = name => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
try {
  await page.goto(new URL('index.html', studio).href);
  await page.evaluate(async files => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('djayvo-web-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('mixes', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('mixes', 'readwrite');
        tx.objectStore('mixes').add({ id: 'pre-rename-session', created: 1792368000000, seed: 4123,
          style: 'three', seconds: 1, files: files.map(({ base64, ...file }) => ({ ...file,
            bytes: Uint8Array.from(atob(base64), char => char.charCodeAt(0)).buffer })) });
        tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }, files);
  await page.reload();
  assert.match(await page.title(), /Jamloom/);
  assert.doesNotMatch(await page.locator('body').innerText(), /Djayvo/i);
  await page.waitForFunction(() => document.querySelectorAll('#library audio').length === 3);
  assert.match(await page.locator('#library-count').textContent(), /1 \/ 10 sessions/);
  pass('Jamloom renders the complete legacy session from the original IndexedDB identity');
  assert.equal(await page.locator('#record').isDisabled(), true);
  await page.locator('#consent').check();
  assert.equal(await page.locator('#record').isEnabled(), true);
  pass('recording remains opt-in; visible consent control responds');
  const link = page.locator('#library .download').first();
  const downloadPromise = page.waitForEvent('download');
  await link.click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^jamloom-hiphop-/);
  const bytes = await readFile(await download.path());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), files.find(file => file.name === 'hiphop.wav').sha256);
  await page.locator('#library audio').first().evaluate(async audio => { audio.muted = true; await audio.play(); });
  await page.waitForFunction(() => document.querySelector('#library audio').currentTime > .05);
  await page.locator('#library audio').first().evaluate(audio => audio.pause());
  pass('legacy WAV plays and downloads byte-exactly with a Jamloom filename');
  // WebKit screenshot tooling injects inline styling blocked by the app CSP.
  const beforeScreenshot = errors.length;
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(output, `${viewport.width}.png`) });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  const screenshotWarnings = errors.splice(beforeScreenshot).filter(message => {
    if (kind === 'webkit' && message.startsWith('Refused to apply a stylesheet')) return true;
    errors.push(message); return false;
  });
  pass('desktop and mobile branded studio renders without horizontal overflow');
  const manifest = await (await context.request.get(new URL('manifest.webmanifest', studio).href)).json();
  assert.equal(manifest.name, 'Jamloom'); assert.equal(manifest.short_name, 'Jamloom');
  assert.equal(manifest.id, './');
  await page.goto('http://localhost:3000/account');
  assert.match(await page.title(), /Jamloom/);
  assert.equal(await page.locator('.brand').textContent(), 'jamloom');
  assert.ok(await page.getByRole('link', { name: 'Sign in', exact: true }).count() || await page.getByRole('button', { name: 'Sign in', exact: true }).count());
  assert.deepEqual(errors, []);
  pass('PWA identity retained, account branding present, no runtime or framework errors');
  await writeFile(join(output, 'report.json'), JSON.stringify({ gate: 'PASS', kind, studio, checks, errors, screenshotWarnings }, null, 2));
  console.log('Artifacts:', output);
} finally { await browser.close(); }
