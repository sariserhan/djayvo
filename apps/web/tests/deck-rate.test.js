import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../deck-controls.js', import.meta.url), 'utf8');
function setup() {
  const nodes = new Map(), queued = [], listeners = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', getContext: () => ({}) });
    return nodes.get(id);
  };
  const audio = { paused: false, playbackRate: 1, currentTime: 1,
    addEventListener: (type, fn, options) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ fn, once: options?.once });
    } };
  const deck = { id: 'a', audio, url: 'blob:original', revision: 0 };
  const pause = () => {
    deck.revision++;
    if (!audio.paused) queued.push(() => {
      for (const listener of [...(listeners.get('pause') || [])]) {
        if (listener.once) listeners.set('pause', listeners.get('pause').filter(row => row !== listener));
        listener.fn();
      }
    });
    audio.paused = true;
  };
  let starts = 0;
  const start = () => { starts++; deck.revision++; audio.paused = false; };
  const sandbox = { document: { getElementById: node }, requestAnimationFrame() {} };
  vm.runInNewContext(source.replaceAll('export function ', 'function ') + '\nglobalThis.attach = attachDeck;', sandbox);
  sandbox.attach(deck, {}, { pause, start, mixer: () => null, context: () => null });
  return { deck, audio, pause, start, node, starts: () => starts,
    rate: value => node('rate-a').oninput({ target: { value } }),
    flush: () => { let count = 0; while (queued.length) { assert.ok(++count < 10); queued.shift()(); } } };
}

test('rapid rates are coalesced until pause completes, then resume at the latest rate', () => {
  const h = setup(); h.rate(1.04); h.rate(1.08);
  assert.equal(h.audio.playbackRate, 1); assert.equal(h.starts(), 0);
  h.flush(); assert.equal(h.audio.playbackRate, 1.08); assert.equal(h.starts(), 1);
  assert.equal(h.node('rate-a').value, 1.08);
});

test('Pause All keeps the requested rate but cancels the pending resume', () => {
  const h = setup(); h.rate(1.12); h.pause(); h.flush();
  assert.equal(h.audio.playbackRate, 1.12); assert.equal(h.audio.paused, true); assert.equal(h.starts(), 0);
});

test('unload/replacement cannot inherit a pending rate or resume from the old source', () => {
  const h = setup(); h.rate(1.12); h.pause(); h.deck.url = 'blob:replacement'; h.rate(.9); h.flush();
  assert.equal(h.audio.playbackRate, .9); assert.equal(h.audio.paused, true); assert.equal(h.starts(), 0);
});

test('an immediate manual Play is safely paused again before applying its pending rate', () => {
  const h = setup(); h.rate(1.1); h.start(); h.flush();
  assert.equal(h.audio.playbackRate, 1.1); assert.equal(h.audio.paused, false); assert.equal(h.starts(), 2);
});
