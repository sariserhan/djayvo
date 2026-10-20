// Explicit provider test: writes only random test objects; never touches the database.
import '../scripts/env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { chromium, webkit } from 'playwright';
import { audioStore } from '../lib/audio-store';
import { readConfig } from '../lib/config';
import { audioFixture, hash } from './audio-fixture';

let gate = 'explicit target confirmation';
const results: { gate: string; status: string }[] = [];
async function main() {
  assert(process.argv.includes('--apply'), 'Pass --apply to create/delete test objects.');
  assert(process.env.R2_BUCKET && process.env.JAMLOOM_R2_TEST_BUCKET === process.env.R2_BUCKET,
    'Set JAMLOOM_R2_TEST_BUCKET to the intended bucket.');
  const config = readConfig({ DATABASE_URL: 'postgresql://test:test@localhost/test',
    BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'test'.repeat(12),
    JAMLOOM_LOCAL_OUTBOX: '/tmp/unused-r2-test-outbox' });
  const store = audioStore(config, { ...process.env, JAMLOOM_R2_ENABLED: 'true',
    JAMLOOM_LOCAL_AUDIO_DIR: '', DJAYVO_LOCAL_AUDIO_DIR: '' })!;
  const id = randomUUID(), staging = `uploads/${id}.wav`, master = `masters/${id}.wav`;
  console.log(JSON.stringify({ bucket: process.env.R2_BUCKET, testObjectId: id,
    timestamp: new Date().toISOString(), node: process.version }));
  const data = audioFixture();
  const request = (url: string, options: RequestInit = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  const check = async (name: string, run: () => Promise<void>) => {
    gate = name; await run(); results.push({ gate, status: 'PASS' });
    console.log(JSON.stringify(results.at(-1)));
  };
  try {
    await check('signed upload and exact server read', async () => {
      const url = await store.uploadURL(staging, data.length, 120);
      const r = await request(url, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: new Uint8Array(data) });
      assert.equal(r.status, 200); await r.arrayBuffer();
      assert.equal(hash(await store.get(staging, data.length)), hash(data));
    });
    await check('signed Content-Type and Content-Length tampering denied', async () => {
      const url = await store.uploadURL(staging, data.length, 120);
      for (const [type, body] of [['application/octet-stream', data], ['audio/wav', data.subarray(0, -4)]] as const) {
        const r = await request(url, { method: 'PUT', headers: { 'Content-Type': type }, body: new Uint8Array(body) });
        assert.equal(r.status, 403); await r.arrayBuffer();
      }
      assert.equal(hash(await store.get(staging, data.length)), hash(data));
    });
    await check('master copy, range playback and download', async () => {
      await store.put(master, await store.get(staging, data.length));
      assert.equal(hash(await store.get(master, data.length)), hash(data));
      const r = await request(await store.playbackURL(master), { headers: { Range: 'bytes=44-107' } });
      assert.equal(r.status, 206);
      assert.equal(r.headers.get('content-range'), `bytes 44-107/${data.length}`);
      assert.deepEqual(Buffer.from(await r.arrayBuffer()), data.subarray(44, 108));
      const download = await request(await store.playbackURL(master, true));
      assert.equal(download.status, 200);
      assert.match(download.headers.get('content-disposition')!, /attachment; filename="jamloom-mix.wav"/);
      assert.match(download.headers.get('cache-control')!, /private/);
      assert.equal(hash(Buffer.from(await download.arrayBuffer())), hash(data));
    });
    await check('temporary upload expiry header; saved master has no expiry', async () => {
      for (const key of [staging, master]) {
        const r = await request(await store.playbackURL(key), { headers: { Range: 'bytes=0-43' } });
        assert.equal(r.status, 206); await r.arrayBuffer();
        if (key === staging) assert.match(r.headers.get('x-amz-expiration')!, /jamloom-temporary-uploads-1-day/);
        else assert.equal(r.headers.get('x-amz-expiration'), null);
      }
    });
    await check('unsigned playback denied', async () => {
      const url = new URL(await store.playbackURL(master)); url.search = '';
      const r = await request(url.toString());
      assert([400, 403].includes(r.status));
      assert.match(await r.text(), /<Code>(InvalidArgument|AccessDenied)<\/Code>/);
    });
    await check('late staging rewrite cannot alter saved master', async () => {
      const changed = Buffer.from(data); changed.writeInt16LE(123, 44);
      await store.put(staging, changed);
      assert.equal(hash(await store.get(master, data.length)), hash(data));
    });
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
      await check(`${name}: real R2 upload, range fetch, decode and blocked foreign origin`, async () => {
        const browser = await engine.launch();
        try {
          const page = await browser.newPage();
          page.setDefaultTimeout(25000);
          // Only the HTML shell is intercepted; every R2 request goes to Cloudflare.
          await page.route('https://www.jamloom.com/r2-provider-test', r => r.fulfill({ contentType: 'text/html', body: '<title>R2 provider test</title>' }));
          await page.goto('https://www.jamloom.com/r2-provider-test');
          const outcome = await page.evaluate(async ({ upload, playback, wav }) => {
            const bytes = Uint8Array.from(atob(wav), c => c.charCodeAt(0));
            const put = await fetch(upload, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: bytes, signal: AbortSignal.timeout(20000) });
            const range = await fetch(playback, { headers: { Range: 'bytes=44-107' }, signal: AbortSignal.timeout(20000) });
            const rangedBytes = await range.arrayBuffer();
            const full = await fetch(playback, { signal: AbortSignal.timeout(20000) });
            const audio = new AudioContext();
            try {
              const decoded = await audio.decodeAudioData(await full.arrayBuffer());
              return { put: put.status, range: range.status, rangeBytes: rangedBytes.byteLength,
                contentRange: range.headers.get('Content-Range'), duration: decoded.duration, channels: decoded.numberOfChannels };
            } finally { await audio.close(); }
          }, { upload: await store.uploadURL(staging, data.length, 120), playback: await store.playbackURL(master), wav: data.toString('base64') });
          assert.deepEqual(outcome, { put: 200, range: 206, rangeBytes: 64,
            contentRange: `bytes 44-107/${data.length}`, duration: 20, channels: 2 });
          await page.route('https://untrusted.invalid/r2-provider-test', r => r.fulfill({ contentType: 'text/html', body: '<title>Disallowed origin</title>' }));
          await page.goto('https://untrusted.invalid/r2-provider-test');
          const blocked = await page.evaluate(async url => {
            try { await fetch(url, { signal: AbortSignal.timeout(20000) }); return false; }
            catch (e) { return e instanceof TypeError; }
          }, await store.playbackURL(master));
          assert.equal(blocked, true);
        } finally { await browser.close(); }
      });
    }
    await check('expired upload grant denied', async () => {
      const url = await store.uploadURL(staging, data.length, 1); await setTimeout(2500);
      const r = await request(url, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: new Uint8Array(data) });
      assert.equal(r.status, 403); await r.arrayBuffer();
    });
  } finally {
    const cleanup = await Promise.allSettled([staging, master].map(async key => {
      await store.remove(key);
      const r = await request(await store.playbackURL(key));
      assert.equal(r.status, 404); await r.arrayBuffer();
    }));
    const status = cleanup.every(r => r.status === 'fulfilled') ? 'PASS' : 'FAIL';
    results.push({ gate: 'test objects deleted and absence verified', status });
    console.log(JSON.stringify(results.at(-1)));
    if (status === 'FAIL') process.exitCode = 1;
  }
}
main().catch(error => {
  // Provider/browser exceptions can contain signed URLs: log only a bounded type and gate.
  console.log(JSON.stringify({ gate, status: 'FAIL', errorType: error instanceof assert.AssertionError ? 'assertion' : 'provider/browser' }));
  process.exitCode = 1;
});
