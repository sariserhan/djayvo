import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const results = [];
for (const [name, kind] of Object.entries({ chromium, webkit })) {
  const browser = await kind.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const Native = AudioContext;
    window.AudioContext = class extends Native {
      createAnalyser() {
        const node = super.createAnalyser(), connect = node.connect.bind(node);
        node.connect = destination => { if (destination === this.destination) { const mute = this.createGain(); mute.gain.value = 0; connect(mute); mute.connect(destination); return destination; } return connect(destination); };
        return node;
      }
    };
  });
  try {
    await page.goto('http://localhost:3000/studio/dj.html');
    assert.equal(await page.title(), 'Djayvo — DJ workspace');
    await page.locator('#performance-title').waitFor();
    await page.locator('#music-rights').check();
    await page.locator('#file-a').setInputFiles('renders/session-native-20261018/session-60000.wav');
    await page.locator('#prepare-a').click();
    await page.waitForFunction(() => !document.getElementById('context-confirmed').disabled, null, { timeout: 30000 });
    await page.locator('#session-bpm').fill('60'); await page.locator('#session-bpm').dispatchEvent('change');
    await page.locator('#session-key').selectOption('60'); await page.locator('#session-mode').selectOption('major'); await page.locator('#context-confirmed').check();
    await page.locator('#session-play').click();
    await page.waitForFunction(() => Number(document.getElementById('output-meter').value) > .001);
    assert.equal(await page.locator('#tone-a').isDisabled(), false);
    await page.locator('#echo-a').fill('0.4'); await page.locator('#echo-a').dispatchEvent('input');
    assert.equal(await page.locator('#echo-a-value').textContent(), '40%');
    assert.equal(await page.locator('#state-a').textContent(), 'Prepared · playing');
    await page.locator('.deck-a').screenshot({ path: `/tmp/djayvo-deckfx-${name}-desktop.png` });
    await page.locator('#fx-reset-a').click();
    await page.locator('#phrase-consent').check();
    await page.locator('#phrase-file').setInputFiles('renders/voice-20261017-221411/source-pcm.wav');
    await page.waitForFunction(() => !document.getElementById('phrase-generate').disabled);
    await page.locator('#phrase-generate').click();
    await page.waitForFunction(() => !document.getElementById('performance-download').hidden || document.getElementById('performance-error').textContent, null, { timeout: 120000 });
    assert.equal(await page.locator('#performance-error').textContent(), '');
    await page.locator('#session-stop').click(); await page.locator('#c-preview').click();
    await page.waitForFunction(() => Number(document.getElementById('output-meter').value) > .001);
    await page.locator('#performance').screenshot({ path: `/tmp/djayvo-session-${name}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#performance').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#performance').screenshot({ path: `/tmp/djayvo-session-${name}-mobile.png` });
    await page.locator('.deck-a').screenshot({ path: `/tmp/djayvo-deckfx-${name}-mobile.png` });
    await page.locator('#c-stop').click();
    assert.deepEqual(errors, []);
    results.push({ browser: name, version: browser.version(), url: page.url(), gate: 'PASS', checks: ['page identity and content', 'prepared A audible PCM', 'prepared A effects enabled, echo readout/reset and deck screenshots', 'integrated worker/context engine/WAV', 'C preview', 'desktop/mobile screenshots and no overflow', 'no page errors'] });
  } finally { await browser.close(); }
}
await fs.writeFile('/tmp/djayvo-session-site.json', JSON.stringify(results, null, 2));
console.log('PASS: integrated Next site in Chromium and WebKit');
