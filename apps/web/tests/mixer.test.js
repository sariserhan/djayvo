import test from 'node:test';
import assert from 'node:assert/strict';
import { mixGains, validateTrack, updateToneEcho, validatePreparedTrack } from '../mixer.js';

test('linear blend bounds coherent summed peaks and supports channel/master silence', () => {
  assert.deepEqual(mixGains(0, [1, 1], 1), [.8, 0]);
  assert.deepEqual(mixGains(1, [1, 1], 1), [0, .8]);
  assert.deepEqual(mixGains(.5, [1, 1], 1), [.4, .4]);
  assert.deepEqual(mixGains(.5, [0, 1], 1), [0, .4]);
  assert.deepEqual(mixGains(.5, [1, 1], 0), [0, 0]);
  for (let i = 0; i <= 100; i++) assert.ok(mixGains(i / 100, [1, 1], 1).reduce((a, b) => a + b) <= .800000000000001);
  for (const invalid of [NaN, Infinity, -1, 1.01]) {
    assert.throws(() => mixGains(invalid, [1, 1], 1));
    assert.throws(() => mixGains(.5, [invalid, 1], 1));
    assert.throws(() => mixGains(.5, [1, 1], invalid));
  }
  assert.throws(() => mixGains(.5, [1], 1));
});

test('track limits reject empty, oversized and nonaudio files before decoding', () => {
  validateTrack({ size: 123, type: 'audio/wav', name: 'clip.wav' });
  validateTrack({ size: 123, type: '', name: 'clip.MP3' });
  for (const file of [ { size: 0, type: 'audio/wav', name: 'x.wav' },
    { size: 100 * 1024 * 1024 + 1, type: 'audio/wav', name: 'x.wav' },
    { size: 12, type: 'text/html', name: 'page.html' } ]) assert.throws(() => validateTrack(file));
});

test('effect boundaries reject nonfinite and out-of-range controls before touching audio', () => {
  for (const values of [[NaN, 0, 300], [-1, 0, 300], [101, 0, 300], [100, Infinity, 300], [100, -.01, 300], [100, .51, 300], [100, 0, NaN], [100, 0, 99], [100, 0, 801]])
    assert.throws(() => updateToneEcho(null, null, ...values), /outside their allowed range/);
});

test('prepared track rejects decoded limits and nonfinite samples beyond the analysis window', () => {
  const pcm = new Float32Array(48000 * 31);
  const buffer = { duration: 31, numberOfChannels: 1, length: pcm.length, getChannelData: () => pcm };
  validatePreparedTrack(buffer);
  pcm[pcm.length - 1] = Infinity;
  assert.throws(() => validatePreparedTrack(buffer), /invalid audio samples/);
  pcm[pcm.length - 1] = 0;
  for (const change of [{ duration: 301 }, { numberOfChannels: 3 }, { length: 128 * 1024 * 1024 }])
    assert.throws(() => validatePreparedTrack({ ...buffer, ...change }));
});
