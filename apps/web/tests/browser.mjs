import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = path.join(root, 'renders/fixtures/synthetic-speech.wav');
const url = 'http://localhost:4173';
const kind = process.env.DJAYVO_BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[kind];
if (!['chromium', 'firefox', 'webkit'].includes(kind)) throw new Error(`Unsupported DJAYVO_BROWSER: ${kind}`);
const output = await fs.mkdtemp(path.join(root, `renders/web-${kind}-ui-`));
console.log('Artifacts:', output);
const browser = await engine.launch(kind === 'chromium' ? {
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${fixture}`],
} : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], requests = [], checks = [], toolingWarnings = [];
let takingScreenshot = false;
async function screenshot(options) {
  await page.waitForTimeout(250); // Let the short colour transition settle before visual evidence.
  takingScreenshot = true;
  try { await page.screenshot(options); } finally { takingScreenshot = false; }
}
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => {
  if (msg.type() !== 'error') return;
  // WebKit blocks Playwright screenshot styling, not application styles.
  if (kind === 'webkit' && takingScreenshot && msg.text().startsWith('Refused to apply a stylesheet'))
    toolingWarnings.push({ reason: 'Playwright screenshot inline styling blocked by CSP', message: msg.text() });
  else errors.push(msg.text());
});
context.on('request', request => { if (/^https?:/.test(request.url())) requests.push({ url: request.url(), method: request.method() }); });
const check = (name) => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
async function ready() {
  await page.waitForFunction(() => document.querySelector('#generate').disabled === false);
}
async function importFixture() {
  await page.locator('#consent').check();
  await page.locator('#file').setInputFiles(fixture); await ready();
}
try {
  await page.goto(url);
  assert.match(await page.title(), /Djayvo/);
  await page.getByRole('heading', { name: 'A little voice. A whole new groove.' }).waitFor();
  assert.equal(await page.locator('#record').isDisabled(), true);
  assert.equal(await page.locator('#generate').isDisabled(), true);
  await screenshot({ path: path.join(output, `${kind}-desktop-empty.png`), fullPage: true });
  check('page identity, content, no overlay, consent required');
  await page.getByRole('button', { name: 'Privacy & credits' }).click();
  assert.equal(await page.locator('#privacy').isVisible(), true);
  await page.keyboard.press('Escape');
  check('privacy dialog keyboard dismissal');
  await importFixture();
  await page.locator('#trim-end').fill('2.23'); await page.locator('#trim-end').dispatchEvent('input');
  await page.locator('#trim-start').fill('0.23'); await page.locator('#trim-start').dispatchEvent('input');
  assert.equal(await page.locator('#start-value').textContent(), '0.23 s');
  assert.equal(await page.locator('#end-value').textContent(), '2.23 s');
  const duration = await page.locator('#preview').evaluate(async audio => {
    if (!audio.readyState) await new Promise(resolve => audio.addEventListener('loadedmetadata', resolve, { once: true }));
    return audio.duration;
  });
  assert.equal(duration, 2);
  check('file import and exact two-second decimal trim');
  await page.locator('#generate').click();
  await page.locator('#cancel').click();
  assert.match(await page.locator('#status').textContent(), /Cancelled/);
  assert.equal(await page.locator('.session').count(), 0);
  check('cancel leaves no partial library session');
  await page.locator('#generate').click();
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 3, { timeout: 90000 });
  await ready();
  assert.equal(await page.locator('#error').isVisible(), false, await page.locator('#error').textContent());
  const firstSeed = await page.locator('.download').first().getAttribute('download');
  const firstAudio = page.locator('.track audio').first();
  await firstAudio.evaluate(async audio => { audio.muted = true; await audio.play(); });
  await page.waitForFunction(() => document.querySelector('.track audio').currentTime > 0.1);
  await page.locator('.track audio').nth(1).evaluate(async audio => { audio.muted = true; await audio.play(); });
  assert.equal(await firstAudio.evaluate(audio => audio.paused), true);
  check('three real WAV mixes, muted playback advances and pauses previous player');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.download').first().click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, `${kind}-download.wav`));
  const bytes = await fs.readFile(path.join(output, `${kind}-download.wav`));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.ok(bytes.length > 1000000);
  check('download contains a real WAV');
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 3);
  assert.equal(await page.locator('#consent').isChecked(), false);
  assert.equal(await page.locator('#trim').isVisible(), false);
  check('library persists; original input and consent do not persist');
  await importFixture();
  await page.locator('input[value=club]').check();
  await page.locator('#generate').click();
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 4, { timeout: 90000 });
  await ready();
  assert.notEqual(await page.locator('.download').first().getAttribute('download'), firstSeed);
  await screenshot({ path: path.join(output, `${kind}-desktop-mixes.png`), fullPage: true });
  check('club generation and fresh seed retain previous mixes');
  for (const style of ['funk', 'call_response', 'hybrid']) {
    await page.locator(`input[value=${style}]`).check();
    await page.locator('#generate').click();
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 5, { timeout: 90000 });
    await ready();
    assert.equal(await page.locator('#error').isVisible(), false, await page.locator('#error').textContent());
    assert.match(await page.locator('.download').first().getAttribute('download'), new RegExp(`^djayvo-${style}-`));
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 5);
    await page.getByRole('button', { name: 'Delete session', exact: true }).first().click();
    await page.locator('#delete-confirm').click();
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 4);
    await importFixture();
    check(`${style} generates, survives reload and deletes without losing earlier mixes`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot({ path: path.join(output, `${kind}-mobile.png`), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByRole('button', { name: 'Delete session', exact: true }).first().click();
  await page.getByRole('button', { name: 'Keep mixes' }).click();
  assert.equal(await page.locator('.session').count(), 2);
  await page.getByRole('button', { name: 'Delete session', exact: true }).first().click();
  await page.locator('#delete-confirm').click();
  await page.waitForFunction(() => document.querySelectorAll('.session').length === 1);
  check('mobile layout and scoped delete confirmation');
  await page.locator('#file').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('invalid audio') });
  await page.locator('#error').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.session').count(), 1);
  check('corrupt import rejected without damaging mixes');
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('djayvo-web-v1');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('mixes', 'readwrite');
        const store = tx.objectStore('mixes'), read = store.getAll();
        read.onsuccess = () => {
          const source = read.result[0];
          for (const [i, entry] of [null, { name: 7, bytes: new ArrayBuffer(4) }].entries())
            store.add({ ...source, id: `malformed-${i}`, files: [entry, ...source.files.slice(1)] });
        };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = reject;
      };
      request.onerror = reject;
    });
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#storage-note').textContent.startsWith('2 incomplete'));
  assert.equal(await page.locator('.session').count(), 1);
  assert.equal(await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).length), 3);
  await page.locator('.track audio').first().evaluate(async audio => { audio.muted = true; await audio.play(); });
  await page.waitForFunction(() => document.querySelector('.track audio').currentTime > 0.1);
  check('malformed saved entries are withheld without hiding healthy playable mixes or deleting damaged data');
  await page.evaluate(async () => {
    const { loadSessions } = await import('./library.js');
    const session = (await loadSessions()).find(item => !item.id.startsWith('malformed-'));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('djayvo-web-v1');
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('mixes', 'readwrite');
        const store = tx.objectStore('mixes'); const read = store.get(session.id);
        read.onsuccess = () => { const raw = read.result; raw.files[0].sha256 = 'tampered'; store.put(raw); };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = reject; };
    });
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#storage-note').textContent.includes('withheld'));
  assert.equal(await page.locator('.session').count(), 0);
  assert.equal(await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).length), 3);
  check('tampered session withheld and preserved for recovery');
  await page.getByRole('button', { name: 'Privacy & credits' }).click();
  await page.locator('#delete-all').click();
  await page.locator('#delete-confirm').click();
  await page.waitForFunction(() => !document.querySelector('#delete-dialog').open);
  assert.equal(await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).length), 0);
  check('explicit delete-all also removes withheld data');
  // Use a separate, disposable origin store for capacity checks, never owner data.
  await page.evaluate(async () => {
    const { saveSession, loadSessions, deleteSession } = await import('./library.js');
    for (const item of await loadSessions()) await deleteSession(item.id);
    for (let i = 0; i < 10; i++) await saveSession({ id: `capacity-${i}`, files: [] });
    let rejected = false;
    try { await saveSession({ id: 'overflow', files: [] }); } catch { rejected = true; }
    if (!rejected || (await loadSessions()).length !== 10) throw new Error('Capacity bound failed');
    for (const item of await loadSessions()) await deleteSession(item.id);
  });
  check('transactional ten-session bound without eviction');
  if (kind === 'chromium') {
    await page.reload(); await page.locator('#consent').check();
    await page.locator('#record').click();
    await page.waitForFunction(() => document.querySelector('#record').textContent.includes('Stop recording'));
    await page.locator('#consent').uncheck();
    assert.equal(await page.locator('#trim').isVisible(), false);
    check('revoking consent stops and discards fake microphone capture');
    await page.locator('#consent').check(); await page.locator('#record').click();
    await ready();
    assert.equal(await page.locator('#trim').isVisible(), true);
    const text = await page.locator('#source-description').textContent(); assert.match(text, /4\.[0-9]+ seconds/);
    await page.locator('#generate').click();
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 3, { timeout: 90000 });
    check('timed fake microphone capture, decode and generation (not physical microphone evidence)');
  }
  assert.equal(requests.some(request => new URL(request.url).origin !== url || request.method !== 'GET'), false);
  assert.deepEqual(errors, []);
  check('same-origin GET requests only; no application console or page errors');
  const report = { status: 'PASS', browser: kind, version: browser.version(), viewport: [1440, 1000], mobile_viewport: [390, 844], checks,
    request_count: requests.length, nonlocal_or_upload_requests: 0, console_errors: errors, tooling_warnings: toolingWarnings,
    physical_microphone: 'NOT RUN', human_listening: 'NOT RUN' };
  await fs.writeFile(path.join(output, `${kind}-report.json`), JSON.stringify(report, null, 2) + '\n');
} catch (error) {
  await screenshot({ path: path.join(output, `${kind}-failure.png`), fullPage: true });
  await fs.writeFile(path.join(output, `${kind}-failure.json`), JSON.stringify({ error: String(error), checks, errors }, null, 2));
  throw error;
} finally { await browser.close(); }
