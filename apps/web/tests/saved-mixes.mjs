import assert from 'node:assert/strict';

export async function verifyPerformanceSave(page, check, downloadHash) {
  assert.equal(await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).length), 0);
  check('generated C remains temporary until an explicit save');
  // Fill the real bounded store without creating extra audio or fixtures.
  await page.evaluate(async () => {
    const { saveSession } = await import('./library.js');
    for (let i = 0; i < 10; i++) await saveSession({ id: `full-${i}`, files: [] });
  });
  await page.locator('#performance-save').click();
  await page.waitForFunction(() => document.getElementById('performance-save-status').textContent.includes('library is full'));
  assert.equal(await page.locator('#performance-download').isVisible(), true);
  assert.equal(await page.locator('#performance-save').isEnabled(), true);
  assert.equal(await page.evaluate(async () => (await (await import('./library.js')).loadSessions()).length), 10);
  check('full library preserves every old entry, ready C and its downloadable audio; save remains retryable');
  await page.evaluate(async () => (await import('./library.js')).deleteAllSessions());
  await page.evaluate(() => { document.getElementById('performance-save').click(); document.getElementById('performance-save').click(); });
  await page.waitForFunction(() => document.getElementById('performance-save').textContent === 'Saved on this device');
  const result = await page.evaluate(async () => {
    const { loadSessions, verifySession } = await import('./library.js');
    const sessions = await loadSessions(), saved = sessions[0];
    return { count: sessions.length, valid: await verifySession(saved), keys: Object.keys(saved).sort(),
      files: saved.files.map(file => file.name).sort(),
      savedHash: saved.files.find(file => file.name.endsWith('.wav')).sha256 };
  });
  assert.equal(result.count, 1); assert.equal(result.valid, true);
  assert.deepEqual(result.keys, ['created', 'files', 'id', 'seconds', 'seed', 'style']);
  assert.deepEqual(result.files, ['call_response.events.tsv', 'call_response.report.json', 'call_response.score.json', 'call_response.wav']);
  assert.equal(result.savedHash, downloadHash);
  assert.equal(await page.locator('#performance-save').isDisabled(), true);
  await page.waitForFunction(() => document.getElementById('saved-mix').options.length === 2);
  await page.locator('#saved-mix').selectOption({ index: 1 });
  assert.equal(await page.locator('#library-load-a').isDisabled(), true);
  check('double save commits once; four verified artifacts match the download and exclude raw phrase/Deck A; prepared A stays protected');
  return result;
}

export async function verifySavedDecks(page, check, capture) {
  await page.reload();
  await page.locator('#saved-mixes a').click();
  await page.waitForFunction(() => document.querySelectorAll('#library audio').length === 1);
  assert.match(await page.locator('#library-count').textContent(), /1 \/ 10 sessions/);
  await page.getByRole('link', { name: 'DJ workspace', exact: true }).click();
  check('Voice studio and DJ workspace share the saved performance after reload');
  await page.locator('#library-refresh').click();
  await page.waitForFunction(() => document.getElementById('saved-mix').options.length === 2);
  await page.locator('#saved-mix').selectOption({ index: 1 });
  assert.equal(await page.locator('#library-load-a').isDisabled(), true);
  assert.equal(await page.locator('#library-load-b').isDisabled(), true);
  check('saved C survives reload and consent withdrawal; loading requires fresh music permission');
  await page.locator('#music-rights').check();
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    window.deckBlobs = new Map();
    URL.createObjectURL = blob => { const url = create(blob); deckBlobs.set(url, blob); return url; };
  });
  for (const id of ['a', 'b']) {
    await page.locator(`#library-load-${id}`).click();
    await page.waitForFunction(id => document.getElementById(`state-${id}`).textContent === 'Ready', id);
    assert.equal(await page.locator(`#play-${id}`).textContent(), `Play ${id.toUpperCase()}`);
    const exact = await page.evaluate(async id => {
      const { loadSessions } = await import('./library.js');
      const saved = (await loadSessions())[0].files.find(file => file.name.endsWith('.wav'));
      const bytes = await deckBlobs.get(document.getElementById(`audio-${id}`).src).arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
      return hash === saved.sha256;
    }, id);
    assert.equal(exact, true);
  }
  await page.locator('#crossfade').fill('0.5'); await page.locator('#crossfade').dispatchEvent('input');
  for (const id of ['a', 'b']) {
    await page.locator(`#play-${id}`).click();
    await page.waitForFunction(id => document.getElementById(`state-${id}`).textContent === 'Playing', id);
    assert.equal(await page.locator(`#library-load-${id}`).isDisabled(), true);
  }
  await page.waitForFunction(() => document.getElementById('output-meter').value > .001);
  check('saved WAV loads byte-exactly into A/B without autoplay; both play real nonzero audio and reject replacement while playing');
  await page.locator('#pause-all').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture('saved-mixes-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#saved-mixes').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => innerWidth === 390 && document.documentElement.scrollWidth <= innerWidth, null, { timeout: 3000 });
  await capture('saved-mixes-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  check('saved-mix controls fit desktop and mobile without horizontal overflow');

  // Pause hashing to withdraw permission while the asynchronous library load is pending.
  await page.evaluate(() => {
    window.digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (...args) => {
      await new Promise(resolve => { window.finishDigest = resolve; });
      crypto.subtle.digest = window.digest;
      return window.digest(...args);
    };
  });
  await page.locator('#library-load-b').click();
  await page.waitForFunction(() => !!window.finishDigest);
  await page.locator('#music-rights').uncheck();
  await page.evaluate(() => finishDigest());
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#audio-b').getAttribute('src'), null);
  assert.equal(await page.locator('#state-b').textContent(), 'Empty');
  await page.locator('#music-rights').check();
  await page.locator('#library-load-b').click();
  await page.waitForFunction(() => document.getElementById('state-b').textContent === 'Ready');
  check('permission withdrawal during verification prevents late loading; a fresh permitted retry succeeds');

  await page.evaluate(async () => {
    const { loadSessions, deleteSession, saveSession } = await import('./library.js');
    const saved = (await loadSessions())[0];
    await deleteSession(saved.id);
    saved.files[0].sha256 = '0'.repeat(64);
    await saveSession(saved);
  });
  const previous = await page.locator('#audio-b').getAttribute('src');
  await page.locator('#library-load-b').click();
  await page.waitForFunction(() => document.getElementById('error-b').textContent.includes('Previous track kept'));
  assert.equal(await page.locator('#audio-b').getAttribute('src'), previous);
  await page.locator('#library-refresh').click();
  await page.waitForFunction(() => document.getElementById('library-status').textContent.includes('damaged'));
  assert.equal(await page.locator('#saved-mix option').count(), 1);
  check('changed/corrupt stored bytes are rechecked on load, leave the old deck intact and are hidden on refresh');
  await page.locator('#saved-mixes a').click();
  await page.locator('#privacy-open').click();
  await page.locator('#delete-all').click();
  await page.locator('#delete-confirm').click();
  await page.waitForFunction(() => !document.getElementById('delete-dialog').open);
  await page.getByRole('link', { name: 'DJ workspace', exact: true }).click();
  await page.locator('#library-refresh').click();
  await page.waitForFunction(() => document.getElementById('library-status').textContent.startsWith('0 saved'));
  check('deleting saved mixes empties the shared library');
}
