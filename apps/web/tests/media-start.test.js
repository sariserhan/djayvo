import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../deck-controls.js', import.meta.url), 'utf8');
function setup() {
  const timers = new Map(); let id = 0;
  const schedule = (fn, delay) => { timers.set(++id, { fn, delay }); return id; };
  const sandbox = { Promise, setTimeout: schedule, setInterval: schedule,
    clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id) };
  vm.runInNewContext(source.replaceAll('export function ', 'function ') + '\nglobalThis.start = playMedia;', sandbox);
  return { start: sandbox.start, timers, tick: milliseconds => {
    for (const [id, timer] of [...timers]) if (timers.has(id) && timer.delay <= milliseconds) timer.fn();
  } };
}
const audio = () => ({ currentTime: 0, paused: false, seeking: false, ended: false, readyState: 1, play: () => Promise.resolve() });

test('Play waits for the actual deck metadata and starts exactly once', async () => {
  const h = setup(), media = audio(); let calls = 0;
  media.readyState = 0; media.play = () => { calls++; return Promise.resolve(); };
  const pending = h.start(media, () => true);
  h.tick(50); assert.equal(calls, 0);
  media.readyState = 1; h.tick(50); h.tick(50); assert.equal(calls, 1);
  await Promise.resolve(); media.currentTime = .1; h.tick(50); await pending;
  assert.equal(h.timers.size, 0);
});

test('cancelled metadata waits cannot start a later source', async () => {
  const h = setup(), media = audio(); let current = true, calls = 0;
  media.readyState = 0; media.play = () => { calls++; return Promise.resolve(); };
  const pending = h.start(media, () => current);
  current = false; h.tick(50); await pending;
  media.readyState = 1; h.tick(50); assert.equal(calls, 0); assert.equal(h.timers.size, 0);
});

test('missing or rejected metadata fails within the existing start deadline', async () => {
  for (const rejected of [false, true]) {
    const h = setup(), media = audio(); media.readyState = 0;
    media.play = () => { throw Error('must not play before metadata'); };
    const failed = assert.rejects(h.start(media, () => true), rejected ? /bad header/ : /did not begin playing/);
    if (rejected) media.error = { message: 'bad header' };
    h.tick(rejected ? 50 : 10000); await failed; assert.equal(h.timers.size, 0);
  }
});

test('resolved play must advance without seeking; successful/short playback cleans up timers', async () => {
  const h = setup(), media = audio(); let settled = false;
  const pending = h.start(media, () => true).then(() => { settled = true; });
  await Promise.resolve(); h.tick(50); await Promise.resolve(); assert.equal(settled, false);
  media.currentTime = .1; media.seeking = true; h.tick(50); await Promise.resolve(); assert.equal(settled, false);
  media.seeking = false; h.tick(50); await pending; assert.equal(h.timers.size, 0);
  media.currentTime = 0;
  const short = h.start(media, () => true); await Promise.resolve();
  media.paused = true; media.ended = true; h.tick(50); await short; assert.equal(h.timers.size, 0);
});

test('stuck seeking and unresolved play both fail within the start deadline', async () => {
  for (const neverResolves of [false, true]) {
    const h = setup(), media = audio(); media.seeking = true;
    if (neverResolves) media.play = () => new Promise(() => {});
    const failed = assert.rejects(h.start(media, () => true), /did not begin playing/);
    await Promise.resolve(); h.tick(10000); await failed; assert.equal(h.timers.size, 0);
  }
});

test('cancellation clears timers and ignores late completion or rejection', async () => {
  for (const reject of [false, true]) {
    const h = setup(), media = audio(); let current = true, complete;
    media.play = () => new Promise((resolve, fail) => { complete = reject ? fail : resolve; });
    const pending = h.start(media, () => current);
    current = false; h.tick(50); await pending; assert.equal(h.timers.size, 0);
    complete(new Error('late failure')); await Promise.resolve(); assert.equal(h.timers.size, 0);
  }
});

test('native synchronous and asynchronous playback errors retain their message and clean up', async () => {
  for (const synchronous of [false, true]) {
    const h = setup(), media = audio();
    media.play = () => { if (synchronous) throw Error('unsupported'); return Promise.reject(Error('unsupported')); };
    await assert.rejects(h.start(media, () => true), /unsupported/); assert.equal(h.timers.size, 0);
  }
});
