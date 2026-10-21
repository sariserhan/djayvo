import { chromium, webkit } from 'playwright';
import { createHash } from 'node:crypto';
import { verifyPerformanceSave, verifySavedDecks } from './saved-mixes.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const results = [];
for (const [name, kind] of Object.entries({ chromium, webkit })) {
  const browser = await kind.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const Native = AudioContext;
    window.AudioContext = class extends Native {
      constructor(options) { super(options); window.testAudioContext ||= this; }
      createAnalyser() {
        const node = super.createAnalyser(), connect = node.connect.bind(node);
        node.connect = destination => { if (destination === this.destination) { const mute = this.createGain(); mute.gain.value = 0; connect(mute); mute.connect(destination); return destination; } return connect(destination); };
        return node;
      }
    };
  });
  const pending = async (play, stop, channel) => {
    await page.evaluate(() => {
      const resume = testAudioContext.resume.bind(testAudioContext);
      testAudioContext.resume = () => {
        testAudioContext.resume = resume;
        const running = resume();
        return new Promise((resolve, reject) => { window.releaseStart = () => running.then(resolve, reject); });
      };
    });
    await page.locator(play).click();
    assert.equal(await page.locator(play).isDisabled(), true);
    assert.equal(await page.locator(stop).isDisabled(), false);
    assert.match(await page.locator('#performance-status').textContent(), /Starting/);
    await page.locator('#performance').screenshot({ path: `/tmp/jamloom-pending-${name}-${channel}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#performance').screenshot({ path: `/tmp/jamloom-pending-${name}-${channel}-mobile.png` });
    await page.locator(stop).click(); await page.evaluate(() => releaseStart());
    assert.equal(await page.locator(play).isDisabled(), false);
    assert.equal(await page.locator(stop).isDisabled(), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
  };
  try {
    await page.goto(`${(process.env.JAMLOOM_STUDIO_URL ?? process.env.DJAYVO_STUDIO_URL) || 'http://localhost:3000/studio'}/dj.html`);
    for (const deck of ['a','b']) await page.locator(`.deck-${deck} .deck-fx-panel summary`).click();
    assert.equal(await page.title(), 'Jamloom — DJ workspace');
    await page.locator('#performance-title').waitFor();
    await page.locator('#music-rights').check();
    await page.locator('#file-a').setInputFiles('renders/session-native-20261018/session-60000.wav');
    await page.locator('#prepare-a').click();
    await page.waitForFunction(() => !document.getElementById('context-confirmed').disabled, null, { timeout: 30000 });
    await page.locator('#session-bpm').fill('60'); await page.locator('#session-bpm').dispatchEvent('change');
    await page.locator('#session-key').selectOption('60'); await page.locator('#session-mode').selectOption('major'); await page.locator('#context-confirmed').check();
    await pending('#session-play', '#session-stop', 'a');
    await page.locator('#session-play').click();
    await page.waitForFunction(() => Number(document.getElementById('output-meter').value) > .001);
    assert.equal(await page.locator('#tone-a').isDisabled(), false);
    await page.locator('#echo-a').fill('0.4'); await page.locator('#echo-a').dispatchEvent('input');
    assert.equal(await page.locator('#echo-a-value').textContent(), '40%');
    assert.equal(await page.locator('#state-a').textContent(), 'Prepared · playing');
    await page.locator('.deck-a').screenshot({ path: `/tmp/jamloom-deckfx-${name}-desktop.png` });
    await page.locator('#fx-reset-a').click();
    await page.locator('#phrase-consent').check();
    await page.locator('#phrase-file').setInputFiles('renders/voice-20261017-221411/source-pcm.wav');
    await page.waitForFunction(() => !document.getElementById('phrase-generate').disabled);
    await page.locator('#phrase-generate').click();
    await page.waitForFunction(() => !document.getElementById('performance-download').hidden || document.getElementById('performance-error').textContent, null, { timeout: 120000 });
    assert.equal(await page.locator('#performance-error').textContent(), '');
    await page.locator('#session-stop').click();
    await pending('#c-preview', '#c-stop', 'c');
    await page.locator('#c-preview').click();
    await page.waitForFunction(() => Number(document.getElementById('output-meter').value) > .001);
    await page.locator('#echo-c').fill('0.4'); await page.locator('#echo-c').dispatchEvent('input');
    await page.locator('#tone-c').fill('60'); await page.locator('#tone-c').dispatchEvent('input');
    assert.equal(await page.locator('#echo-c-value').textContent(), '40%');
    assert.equal(await page.locator('#tone-c-value').textContent(), '3170 Hz');
    await page.locator('#echo-grid-c').selectOption('dotted');
    assert.equal(await page.locator('#echo-grid-c-value').textContent(), '750 ms');
    assert.equal(await page.locator('#delay-c').isDisabled(), true);
    await page.locator('#performance').screenshot({ path: `/tmp/jamloom-session-${name}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#performance').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#performance').screenshot({ path: `/tmp/jamloom-session-${name}-mobile.png` });
    await page.locator('.deck-a').screenshot({ path: `/tmp/jamloom-deckfx-${name}-mobile.png` });
    await page.locator('#c-stop').click();
    assert.equal(await page.locator('#performance-status').textContent(), 'C stopped.');
    const savedChecks = [];
    const check = name => savedChecks.push({ name, status: 'PASS' });
    const downloading = page.waitForEvent('download');
    await page.locator('#performance-download').click();
    const download = await downloading;
    const savedMix = await verifyPerformanceSave(page, check, createHash('sha256').update(await fs.readFile(await download.path())).digest('hex'));
    await verifySavedDecks(page, check, name => page.locator('#saved-mixes').screenshot({ path: `/tmp/jamloom-${name}-${browser.browserType().name()}.png` }));
    assert.deepEqual(errors, []);
    results.push({ browser: name, version: browser.version(), url: page.url(), gate: 'PASS', savedChecks, savedMix, checks: ['page identity and content', 'pending A and C: disabled duplicate start, enabled stop, desktop/mobile screenshots, cancel and late resume', 'prepared A audible PCM', 'prepared A effects enabled, echo readout/reset and deck screenshots', 'integrated worker/context engine/WAV', 'C preview, tone and tempo-synced dotted eighth echo at 60 BPM', 'desktop/mobile screenshots and no overflow', 'no page errors'] });
  } finally { await browser.close(); }
}
await fs.writeFile('/tmp/jamloom-session-site.json', JSON.stringify(results, null, 2));
console.log('PASS: integrated Next site in Chromium and WebKit');
