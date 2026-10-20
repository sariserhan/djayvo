import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function capture({ stale = false, missing = false, changed = false } = {}) {
  let Processor, result;
  const scope = vm.createContext({ AudioWorkletProcessor: class {
    constructor() { this.port = { postMessage: data => { result = data; } }; }
  }, registerProcessor: (_, cls) => { Processor = cls; }, currentFrame: 0 });
  vm.runInContext(fs.readFileSync(new URL('./worklet-capture.js', import.meta.url), 'utf8'), scope);
  const processor = new Processor({ processorOptions: { frames: 512 } });
  // Leading silence before the independent counter starts is not captured.
  processor.process([[], []]);
  for (let block = 0; block < 4; block++) {
    scope.currentFrame = (stale && block === 2 ? 1 : block) * 128;
    const left = new Float32Array(128).fill(changed && block === 2 ? 0 : .125);
    const right = new Float32Array(128).fill(-.25);
    const counter = Float32Array.from({ length: 128 }, (_, i) =>
      (block * 128 + i + 1 + (missing && block >= 2 ? 128 : 0)) / 8388608);
    processor.process([[left, right], [counter]]);
  }
  return result;
}

test('worklet capture keeps both channels and every independent frame', () => {
  const result = capture();
  assert.equal(result.counterGaps, 0); assert.equal(result.timestampGaps, 0); assert.equal(result.lastCounter, 512);
  const pcm = new Float32Array(result.pcm);
  assert.equal(pcm.length, 1024);
  for (let i = 0; i < pcm.length; i++) assert.equal(pcm[i], i % 2 ? -.25 : .125);
});
test('stale browser timestamps do not become false missing-sample claims', () => {
  const result = capture({ stale: true });
  assert.equal(result.timestampGaps, 2); assert.equal(result.counterGaps, 0);
  assert.deepEqual(new Float32Array(result.pcm), new Float32Array(capture().pcm));
});
test('missing counter samples and altered audio remain detectable', () => {
  assert.equal(capture({ missing: true }).counterGaps, 1);
  const changed = capture({ changed: true });
  assert.equal(changed.counterGaps, 0);
  assert.notDeepEqual(new Float32Array(changed.pcm), new Float32Array(capture().pcm));
});

test('load probe dispatches on/off at exact frames across program boundaries', () => {
  let Probe, complete, renders = 0;
  const applied = [];
  const scope = vm.createContext({ JamloomInstruments: class {
    constructor() {
      this.port = { onmessage: ({ data }) => applied.push([renders * 128, data.type, data.id]),
        postMessage: data => { complete = data; } };
      this.engine = { memory: { buffer: new ArrayBuffer(16) }, jamloom_live_active: () => 0 };
    }
    process() { renders++; return true; }
  }, registerProcessor: (_, cls) => { Probe = cls; } });
  vm.runInContext(fs.readFileSync(new URL('./worklet-load.js', import.meta.url), 'utf8'), scope);
  const probe = new Probe({ processorOptions: { frames: 960000,
    events: [[0, 1, 1, 0, 60, 100], [479872, 0, 1, 0, 60, 100]] } });
  const output = [[new Float32Array(128), new Float32Array(128)]];
  for (let i = 0; i < 7501; i++) probe.process([], output, {});
  assert.equal(renders, 7500); assert.equal(complete.commands, 4);
  assert.deepEqual(applied, [[0, 'note', 1], [479872, 'off', 1], [480000, 'note', 1], [959872, 'off', 1]]);
  assert.deepEqual(Array.from(new Uint32Array(complete.commandFrames)), applied.map(event => event[0]));
  assert.equal(new Float64Array(complete.durations).length, 7500);
});
