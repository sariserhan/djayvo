import assert from 'node:assert/strict';

// Hold only the resume promise; the real browser audio context still runs.
export async function verifyPendingStart(page, channel, capture) {
  const play = channel === 'a' ? '#session-play' : '#c-preview';
  const stop = channel === 'a' ? '#session-stop' : '#c-stop';
  await page.evaluate(() => {
    window.scheduledStarts = [];
    if (!window.originalBufferSource) {
      window.originalBufferSource = testAudioContext.createBufferSource.bind(testAudioContext);
      testAudioContext.createBufferSource = () => {
        const source = originalBufferSource(), start = source.start.bind(source);
        source.start = (...args) => { scheduledStarts.push(args[0]); return start(...args); };
        return source;
      };
    }
  });
  const hold = () => page.evaluate(() => {
    const resume = testAudioContext.resume.bind(testAudioContext);
    testAudioContext.resume = () => {
      testAudioContext.resume = resume;
      const running = resume();
      return new Promise((resolve, reject) => {
        window.finishResume = fail => running.then(() => fail ? reject(new Error('Injected old resume failure')) : resolve(), reject);
      });
    };
  });
  await hold(); await page.locator(play).click();
  assert.equal(await page.locator(play).isDisabled(), true, `${channel}: pending start must prevent duplicate requests`);
  assert.equal(await page.locator(stop).isDisabled(), false, `${channel}: pending start must be cancellable`);
  assert.match(await page.locator('#performance-status').textContent(), /Starting/);
  for (const id of ['phrase-record', 'phrase-file', 'phrase-generate', 'context-confirmed'])
    assert.equal(await page.locator(`#${id}`).isDisabled(), true);
  assert.deepEqual(await page.evaluate(() => scheduledStarts), []);
  await capture(`pending-${channel}.png`);
  await page.locator(stop).click();
  await page.evaluate(() => finishResume(false)); await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(() => scheduledStarts), [], `${channel}: cancelled resume scheduled audio`);
  assert.equal(await page.locator(play).isDisabled(), false);
  assert.equal(await page.locator(stop).isDisabled(), true);
  // A failed old request cannot overwrite a newer successful start.
  await hold(); await page.locator(play).click(); await page.locator(stop).click();
  await page.locator(play).click();
  await page.waitForFunction(() => scheduledStarts.length === 1);
  await page.evaluate(() => finishResume(true)); await page.waitForTimeout(150);
  assert.equal(await page.locator('#performance-error').textContent(), '');
  assert.equal(await page.locator(stop).isDisabled(), false);
  await page.waitForFunction(() => {
    const samples = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs)) > .001;
  }, null, { timeout: 5000 });
  await page.locator(stop).click();
  await page.evaluate(() => {
    const resume = testAudioContext.resume.bind(testAudioContext);
    testAudioContext.resume = () => { testAudioContext.resume = resume; return Promise.reject(new Error('Injected current resume failure')); };
  });
  await page.locator(play).click();
  await page.waitForFunction(() => document.getElementById('performance-error').textContent.includes('Injected current resume failure'));
  assert.equal(await page.locator(play).isDisabled(), false);
  assert.equal(await page.locator(stop).isDisabled(), true);
  assert.equal(await page.evaluate(() => scheduledStarts.length), 1);
  await page.locator(play).click();
  await page.waitForFunction(() => scheduledStarts.length === 2);
  assert.equal(await page.locator('#performance-error').textContent(), '');
  await page.locator(stop).click();
  await hold(); await page.locator(play).click();
  await page.waitForFunction(() => document.getElementById('performance-error').textContent.includes('Audio did not wake up'), null, { timeout: 15000 });
  assert.equal(await page.locator(play).isDisabled(), false);
  assert.equal(await page.locator(stop).isDisabled(), true);
  assert.equal(await page.evaluate(() => scheduledStarts.length), 2);
  await page.locator(play).click();
  await page.waitForFunction(() => scheduledStarts.length === 3);
  await page.evaluate(() => finishResume(false)); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scheduledStarts.length), 3, 'Timed-out resume scheduled an extra source');
  assert.equal(await page.locator('#performance-error').textContent(), '');
  await page.locator(stop).click();
  return { channel, status: 'PASS', cancelledStarts: 0, successfulStarts: 3, staleFailureIgnored: true, currentFailureRecoverable: true, resumeTimeoutRecoverable: true };
}

export async function verifyPendingConsent(page) {
  await page.evaluate(() => {
    scheduledStarts = [];
    const resume = testAudioContext.resume.bind(testAudioContext);
    testAudioContext.resume = () => {
      testAudioContext.resume = resume;
      return new Promise(resolve => { window.finishResume = resolve; });
    };
  });
  await page.locator('#c-preview').click();
  assert.equal(await page.locator('#c-stop').isDisabled(), false);
  await page.locator('#phrase-consent').uncheck();
  await page.evaluate(() => finishResume()); await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => scheduledStarts), []);
  assert.equal(await page.locator('#c-stop').isDisabled(), true);
  assert.equal(await page.locator('#c-preview').isDisabled(), true);
  assert.equal(await page.locator('#performance-download').isVisible(), false);
  assert.equal(await page.locator('#performance-error').textContent(), '');
  assert.ok(Number(await page.locator('#output-meter').getAttribute('value')) < .0001);
  assert.equal(await page.locator('#performance-status').textContent(), 'Playback request cancelled.');
}
