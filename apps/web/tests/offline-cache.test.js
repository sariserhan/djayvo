import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('reinstall reuses a complete verified cache without redownloading or deleting it', async () => {
  const handlers = new Map();
  const scope = 'https://example.test/studio/';
  const key = `djayvo-studio:${scope}:test-version`;
  const source = (await readFile(new URL('../../../scripts/service-worker.js', import.meta.url), 'utf8'))
    .replace('__DJAYVO_ASSETS__', JSON.stringify({ 'index.html': { bytes: 6, sha256: 'unused-for-existing-cache' } }))
    .replace('__DJAYVO_VERSION__', 'test-version');
  let requests = 0, deletions = 0;
  vm.runInNewContext(source, {
    self: { registration: { scope }, addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: { keys: async () => [key], open: async name => {
      assert.equal(name, key);
      return { match: async url => { assert.equal(url, `${scope}index.html`); return new Response('public'); } };
    }, delete: async () => { deletions++; } },
    fetch: async () => { requests++; throw Error('Network disconnected'); },
    URL, Response, Headers, crypto, AbortController, AbortSignal, setTimeout, clearTimeout,
  });
  let installed;
  handlers.get('install')({ waitUntil: promise => { installed = promise; } });
  await installed;
  assert.equal(requests, 0);
  assert.equal(deletions, 0);
});
