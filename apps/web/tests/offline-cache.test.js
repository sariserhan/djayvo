import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('verified cache survives reinstall and serves fragment navigation without caching private URLs', async () => {
  const handlers = new Map();
  const scope = 'https://example.test/studio/';
  const key = `djayvo-studio:${scope}:test-version`;
  const source = (await readFile(new URL('../../../scripts/service-worker.js', import.meta.url), 'utf8'))
    .replace('__JAMLOOM_ASSETS__', JSON.stringify({ 'index.html': { bytes: 6, sha256: 'unused-for-existing-cache' } }))
    .replace('__JAMLOOM_VERSION__', 'test-version');
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
  for (const url of [scope, `${scope}#mixes`, `${scope}index.html#mixes`]) {
    let response;
    handlers.get('fetch')({ request: new Request(url), respondWith: promise => { response = promise; } });
    assert.equal(await (await response).text(), 'public');
  }
  for (const url of [`${scope}index.html?private=1#mixes`, 'https://example.test/account#mixes',
    'https://example.test/api/library', 'https://other.test/studio/index.html#mixes']) {
    handlers.get('fetch')({ request: new Request(url), respondWith: () => assert.fail('Private request intercepted') });
  }
  handlers.get('fetch')({ request: new Request(`${scope}index.html`, { method: 'POST' }), respondWith: () => assert.fail('POST intercepted') });
  assert.equal(requests, 0);
  assert.equal(deletions, 0);
});
