import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const name of ['browser.mjs', 'browser-render.mjs']) test(`${name} rejects unknown browsers before launching`, () => {
  for (const kind of ['safari', 'toString']) {
    const result = spawnSync(process.execPath, [new URL(name, import.meta.url).pathname], {
      env: { ...process.env, DJAYVO_BROWSER: kind }, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported DJAYVO_BROWSER/);
    assert.equal(result.stdout, '');
  }
});
