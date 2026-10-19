// Run from the repository root; captures native recording capability, not physical input.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
const { chromium, webkit } = await import(pathToFileURL(path.resolve('apps/web/node_modules/playwright/index.mjs')));
const kind = process.env.DJAYVO_BROWSER || 'webkit';
assert.ok(['chromium', 'webkit'].includes(kind));
assert.equal(process.argv.length, 3, 'Usage: node capability.mjs OUTPUT_DIRECTORY');
const output = process.argv[2]; await fs.mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://local').pathname.slice(1);
  if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').includes('..')) { response.writeHead(404); response.end(); return; }
  try {
    const bytes = await fs.readFile(path.join('dist/web', name));
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' })[path.extname(name)] || 'application/octet-stream' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await { chromium, webkit }[kind].launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const pages = [];
  for (const [file, consent, record, input] of [
    ['index.html', '#consent', '#record', '#import'], ['dj.html', '#phrase-consent', '#phrase-record', '#phrase-file'],
  ]) {
    await page.goto(`http://127.0.0.1:${server.address().port}/${file}`);
    await page.locator(consent).check();
    const capability = await page.evaluate(() => ({ secure: isSecureContext, capture: typeof navigator.mediaDevices?.getUserMedia, recorder: typeof MediaRecorder }));
    const available = capability.capture === 'function' && capability.recorder === 'function';
    await page.waitForFunction(({ record, available }) => document.querySelector(record).disabled === !available, { record, available });
    assert.equal(await page.locator(input).isDisabled(), false);
    if (!available) assert.equal(await page.locator(record).textContent(), 'Recording unavailable');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.waitForTimeout(250); // Let the consent control's colour transition settle.
    await page.locator(record).locator('..').screenshot({ path: path.join(output, `${file}.png`) });
    pages.push({ file, capability, recordingAvailable: available, label: await page.locator(record).textContent(), consentedImportEnabled: true });
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', browser: kind, version: browser.version(), pages, errors, physicalMicrophone: 'NOT RUN' }, null, 2));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
