import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fakeMidi } from './midi-browser.mjs';
const results = [];
for (const [name, kind] of Object.entries({ chromium, webkit })) {
  const browser = await kind.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], warnings = []; let screenshot = false;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') {
    if (screenshot && name === 'webkit' && m.text().startsWith('Refused to apply a stylesheet')) warnings.push(m.text());
    else errors.push(m.text());
  } });
  await page.addInitScript(fakeMidi);
  await page.addInitScript(() => {
    const Native = AudioContext;
    window.AudioContext = class extends Native {
      createAnalyser() {
        const node = super.createAnalyser(), connect = node.connect.bind(node);
        window.testMeter ||= node;
        node.connect = destination => { if (destination === this.destination) { const mute = this.createGain(); mute.gain.value = 0; connect(mute); mute.connect(destination); return destination; } return connect(destination); };
        return node;
      }
    };
  });
  try {
    await page.goto('http://localhost:3000/studio/dj.html');
    assert.equal(await page.title(), 'Djayvo — DJ workspace');
    await page.getByRole('heading', { name: 'Performance studio' }).waitFor();
    await page.locator('#load-instruments').click();
    await page.waitForFunction(() => document.getElementById('instrument-status').textContent.startsWith('Ready'));
    await page.locator('#patch').selectOption('6');
    await page.locator('#midi-enable').click(); await page.locator('#midi-input').selectOption('one');
    await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
    await page.evaluate(() => midiPorts[0].emit([0x90, 60, 100]));
    await page.waitForFunction(() => document.getElementById('output-meter').value > .001);
    assert.equal(await page.locator('[data-pitch="60"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#midi-target').selectOption('master'); await page.locator('#midi-learn').click();
    await page.evaluate(() => midiPorts[0].emit([0xb0, 7, 0]));
    assert.equal(await page.locator('#master').inputValue(), '0.75');
    await page.evaluate(() => { midiPorts[0].emit([0xb0, 7, 95]); midiPorts[0].emit([0xb0, 7, 0]); });
    await page.waitForFunction(() => document.getElementById('output-meter').value < .0001);
    await page.evaluate(() => midiPorts[0].emit([0xb0, 7, 127]));
    await page.waitForFunction(() => document.getElementById('output-meter').value > .001);
    assert.match(await page.locator('#midi-bindings').textContent(), /Master level · active/);

    for (const [label, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
      await page.setViewportSize({ width, height }); await page.locator('.midi-controls').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      screenshot = true;
      try { await page.screenshot({ path: `/tmp/djayvo-midi-${name}-${label}.png` }); }
      finally { screenshot = false; }
    }
    await page.locator('#midi-enable').click();
    await page.waitForFunction(() => document.getElementById('output-meter').value < .0001);
    assert.equal(await page.locator('#midi-bindings li').count(), 0);
    assert.deepEqual(errors, []);
    results.push({ browser: name, version: browser.version(), url: page.url(), gate: 'PASS',
      nativeMidiAvailable: await page.evaluate(() => nativeMidiAvailable), syntheticPort: true,
      checks: ['page identity/content', 'actual instrument PCM from MIDI event', 'learn consumes CC; pickup master mute/unmute changes real PCM', 'disable clears mappings', 'disable releases audio', 'desktop/mobile screenshots and no overflow', 'no page/console errors'], warnings });
  } finally { await browser.close(); }
}
await fs.writeFile('/tmp/djayvo-midi-site.json', JSON.stringify(results, null, 2));
console.log('PASS: integrated MIDI controls, real worklet PCM and responsive screenshots in both browsers (synthetic ports)');
