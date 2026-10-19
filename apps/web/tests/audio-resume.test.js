import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../audio.js', import.meta.url), 'utf8');
function setup() {
  const timers = new Map(); let id = 0;
  const sandbox = { Promise,
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(source.replaceAll('export ', '') + '\nglobalThis.resume = resumeAudio;', sandbox);
  return { resume: sandbox.resume, timers, expire() {
    for (const { fn, delay } of timers.values()) { assert.equal(delay, 10000); fn(); }
  } };
}

test('audio resume clears its deadline on success and rejects a still-suspended context', async () => {
  const h = setup();
  await h.resume({ resume: () => Promise.resolve(), state: 'running' });
  assert.equal(h.timers.size, 0);
  await assert.rejects(h.resume({ resume: () => Promise.resolve(), state: 'suspended' }), /suspended/);
  assert.equal(h.timers.size, 0);
});

test('audio resume retains synchronous and asynchronous errors and clears the deadline', async () => {
  for (const sync of [true, false]) {
    const h = setup();
    await assert.rejects(h.resume({ resume() {
      if (sync) throw new Error('closed context');
      return Promise.reject(new Error('closed context'));
    } }), /closed context/);
    assert.equal(h.timers.size, 0);
  }
});

test('hung audio resume times out and late completion cannot revive its caller', async () => {
  for (const reject of [false, true]) {
    const h = setup(); let finish, continued = false;
    const pending = h.resume({ state: 'running', resume: () => new Promise((resolve, fail) => { finish = reject ? fail : resolve; }) })
      .then(() => { continued = true; });
    const failed = assert.rejects(pending, /Audio did not wake up/);
    h.expire(); await failed;
    finish(new Error('late error')); await Promise.resolve();
    assert.equal(continued, false); assert.equal(h.timers.size, 0);
    await h.resume({ state: 'running', resume: () => Promise.resolve() });
    assert.equal(h.timers.size, 0);
  }
});
