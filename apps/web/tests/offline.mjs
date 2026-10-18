import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'chromium';
assert.ok(['chromium', 'firefox', 'webkit'].includes(kind), 'Unsupported DJAYVO_BROWSER');
const standalone = process.env.DJAYVO_OFFLINE_ROOT === '1';
const mount = standalone ? '/' : '/studio/';
const output = await fs.mkdtemp(path.join(root, `renders/web-${kind}-${standalone ? 'root-' : ''}offline-`));
console.log('Artifacts:', output);
const bundle = path.join(output, 'bundle');
await fs.cp(path.join(root, standalone ? 'dist/web' : 'apps/site/public/studio'), bundle, { recursive: true });
const baseWorker = await fs.readFile(path.join(bundle, 'service-worker.js'));
let corrupt = false;
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.html': 'text/html', '.txt': 'text/plain' };
const network = [];
const server = createServer(async (req, res) => {
  network.push({ method: req.method, path: req.url });
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/account' || url.pathname === '/api/private') {
    res.setHeader('Content-Type', 'text/html'); res.end('<title>Uncached account test</title>private test response'); return;
  }
  if (!url.pathname.startsWith(mount)) { res.writeHead(404); res.end(); return; }
  const name = url.pathname.slice(mount.length) || 'index.html';
  if (name.includes('..') || name.includes('\\')) { res.writeHead(400); res.end(); return; }
  try {
    let bytes = await fs.readFile(path.join(bundle, name));
    if (corrupt && name === 'engine/djayvo_web.wasm') { bytes = Buffer.from(bytes); bytes[bytes.length - 1] ^= 1; }
    res.setHeader('Content-Type', mime[path.extname(name)] || 'application/octet-stream');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'");
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;
const url = `${origin}${mount}`;
const prefix = `djayvo-studio:${url}:`;
const browser = await ({ chromium, firefox, webkit }[kind]).launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
let page = await context.newPage();
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = name => { checks.push({ name, status: 'PASS' }); console.log('PASS:', name); };
async function waitForAsync(predicate, arg) {
  const deadline = Date.now() + 30000;
  while (!await page.evaluate(predicate, arg)) {
    assert.ok(Date.now() < deadline, 'Async browser condition timed out');
    await page.waitForTimeout(50);
  }
}
const keys = () => page.evaluate(async prefix => (await caches.keys()).filter(key => key.startsWith(prefix)), prefix);
async function privacy() {
  if (!await page.locator('#privacy').isVisible()) await page.locator('#privacy-open').click();
}
async function generate(style, tracks) {
  await page.locator('#consent').check();
  await page.locator('#file').setInputFiles(path.join(root, 'renders/fixtures/synthetic-speech.wav'));
  await page.waitForFunction(() => !document.querySelector('#generate').disabled);
  await page.locator(`input[value=${style}]`).check();
  await page.locator('#generate').click();
  await page.waitForFunction(count => document.querySelectorAll('.track').length === count, tracks, { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('#generate').disabled);
  assert.equal(await page.locator('#error').isVisible(), false, await page.locator('#error').textContent());
}
try {
  await page.goto(url);
  assert.match(await page.title(), /Djayvo/);
  assert.deepEqual(await keys(), []);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  await page.evaluate(async () => { const cache = await caches.open('other-app-test'); await cache.put('/other', new Response('keep')); });
  await generate('club', 1);
  const saved = await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).map(item => item.id));
  check('no cache or registration before opt-in; ordinary local generation works');
  await privacy(); corrupt = true;
  await page.locator('#offline-enable').click();
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Could not save'), null, { timeout: 90000 });
  assert.deepEqual(await keys(), []);
  assert.equal(await page.locator('.session').count(), 1);
  check('corrupt download rejects installation and removes partial cache without touching mixes');
  corrupt = false;
  await page.locator('#offline-enable').click();
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Studio saved'), null, { timeout: 90000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  const initialKeys = await keys(); assert.equal(initialKeys.length, 1);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  assert.equal(await page.evaluate(() => navigator.serviceWorker.controller.scriptURL), `${url}service-worker.js`);
  const cachedURLs = await page.evaluate(async key => (await (await caches.open(key)).keys()).map(request => request.url), initialKeys[0]);
  assert.ok(cachedURLs.every(item => item.startsWith(url) && !/\.wav$|\/api\/|\/account/.test(item)));
  assert.ok(cachedURLs.includes(`${url}engine/djayvo_web.wasm`));
  assert.equal(await page.evaluate(async () => (await fetch('/api/private')).status), 200);
  assert.equal(await page.evaluate(async () => (await fetch('/account')).status), 200);
  assert.equal(await page.evaluate(async key => (await (await caches.open(key)).keys()).length, initialKeys[0]), cachedURLs.length);
  check(`complete app/engine cache serves only its allowlist under ${mount}; account/API responses are excluded`);
  // Disconnect the real server: browser offline emulation handles service workers inconsistently.
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  const beforeOffline = network.length;
  await page.goto(`${url}index.html`);
  await page.waitForFunction(() => document.querySelectorAll('.track').length === 1);
  assert.equal(await page.locator('#consent').isChecked(), false);
  await generate('three', 4);
  const player = page.locator('.track audio').first();
  await player.evaluate(async audio => { audio.muted = true; await audio.play(); });
  await page.waitForFunction(() => document.querySelector('.track audio').currentTime > .1);
  await player.evaluate(audio => { audio.pause(); audio.currentTime = 10; });
  await page.waitForFunction(() => !document.querySelector('.track audio').seeking);
  const downloading = page.waitForEvent('download'); await page.locator('.download').first().click();
  await (await downloading).saveAs(path.join(output, 'offline-download.wav'));
  assert.equal((await fs.readFile(path.join(output, 'offline-download.wav'))).toString('ascii', 0, 4), 'RIFF');
  assert.equal(network.length, beforeOffline);
  check('offline reload/import/three-take generation/play/seek/download succeed with no server requests');
  await privacy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#offline-enable').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'offline-mobile.png') });
  await page.locator('#privacy-close').click();
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  if (!standalone) {
    const index = path.join(bundle, 'index.html');
    await fs.writeFile(index, (await fs.readFile(index, 'utf8')).replace('Made here. Kept here.', 'Offline update test.'));
    execFileSync('python3', ['scripts/build_offline.py', bundle], { cwd: root });
    assert.ok(!baseWorker.equals(await fs.readFile(path.join(bundle, 'service-worker.js'))));
    corrupt = true;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      const worker = registration.installing;
      if (!worker) throw new Error('Expected installing update');
      await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Failed update did not settle')), 30000); const changed = () => { if (worker.state === 'redundant') { clearTimeout(timeout); resolve(); } }; worker.addEventListener('statechange', changed); changed(); });
    });
    assert.deepEqual(await keys(), initialKeys);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 4);
    assert.equal(await page.locator('footer').textContent(), 'Made here. Kept here.');
    check('failed update retains the complete old studio and all saved music');
    corrupt = false;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await waitForAsync(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    assert.equal((await keys()).length, 2);
    assert.equal(await page.locator('footer').textContent(), 'Made here. Kept here.');
    assert.match(await page.evaluate(async () => (await fetch('./index.html')).text()), /Made here\. Kept here\./);
    check('successful update waits while the old studio remains open; no forced reload or mixed assets');
    const pendingKeys = await keys();
    const pendingIndex = await fs.readFile(index);
    const pendingWorker = await fs.readFile(path.join(bundle, 'service-worker.js'));
    await fs.writeFile(index, pendingIndex.toString().replace('Offline update test.', 'A third update.'));
    execFileSync('python3', ['scripts/build_offline.py', bundle], { cwd: root });
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      const worker = registration.installing;
      if (!worker) throw new Error('Expected third update');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Update did not settle')), 30000);
        const changed = () => { if (['installed', 'redundant'].includes(worker.state)) { clearTimeout(timeout); resolve(); } };
        worker.addEventListener('statechange', changed); changed();
      });
    });
    assert.deepEqual(await keys(), pendingKeys);
    assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), true);
    await fs.writeFile(index, pendingIndex);
    await fs.writeFile(path.join(bundle, 'service-worker.js'), pendingWorker);
    check('repeated pending updates retain complete active/waiting caches; storage stays bounded');
    const outside = await context.newPage();
    await outside.goto(`${origin}/account`);
    await page.close(); page = outside;
    page.on('pageerror', error => errors.push(error.message));
    await waitForAsync(async ({ scope, prefix, previous }) => {
      const registration = await navigator.serviceWorker.getRegistration(scope);
      const keys = (await caches.keys()).filter(key => key.startsWith(prefix));
      return registration?.active?.state === 'activated' && !registration.waiting && !registration.installing
        && keys.length === 1 && keys[0] !== previous;
    }, { scope: url, prefix, previous: initialKeys[0] });
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.track').length === 4);
    assert.equal(await page.locator('footer').textContent(), 'Offline update test.');
    assert.equal((await keys()).length, 1);
    assert.notDeepEqual(await keys(), initialKeys);
    assert.equal(await page.evaluate(async () => !!await (await caches.open('other-app-test')).match('/other')), true);
    check('update activates after closing studio tabs; old owned cache removed, unrelated cache and mixes retained');
  }
  await privacy(); await page.locator('#offline-remove').click();
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Offline studio removed'));
  assert.deepEqual(await keys(), []);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  const current = await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).map(item => item.id));
  assert.equal(current.length, 2); assert.ok(current.includes(saved[0]));
  assert.equal(await page.evaluate(async () => !!await (await caches.open('other-app-test')).match('/other')), true);
  check('explicit removal unregisters only studio/cache and preserves every mix and unrelated cache');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', mount, browser: kind, version: browser.version(), checks, cached_asset_count: cachedURLs.length, errors,
    non_get_requests: network.filter(item => item.method !== 'GET'), physical_microphone: 'NOT RUN', human_listening: 'NOT RUN', hosting: 'NOT RUN' }, null, 2) + '\n');
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), checks, errors }, null, 2));
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
