import test from 'node:test';
import assert from 'node:assert/strict';
import { MixSources, validateMixSources } from '../mix-sources.js';
import { sha256 } from '../live-take.js';

const receipt = { wav_sha256: 'a'.repeat(64), sample_rate: 48000, observed_context_start_frame: 48128 };
const clock = seconds => ({ currentTime: seconds, sampleRate: 48000 });

test('sampler source inventory upgrades old snapshots and retains exact sample bytes',async()=>{
 const capture=new MixSources();capture.record({},clock(1));
 const sample=new Blob(['cleared local sample']);capture.record({sample0:sample,sample7:sample},clock(1.2));
 const value=await capture.finish(receipt);assert.equal(value.schema_version,'3.0-mix-sources');
 assert.equal(value.assets[0].kind,'sampler_audio');assert.equal(value.snapshots[0].sample0,null);
 assert.equal(value.snapshots[1].sample7,value.snapshots[1].sample0);
 assert.equal(value.assets[0].sha256,await sha256(await sample.arrayBuffer()));
});

test('source inventory hashes exact immutable bytes after capture, deduplicates shared blobs and retains unload history', async () => {
  let reads = 0;
  class Counted extends Blob { async arrayBuffer() { reads++; return super.arrayBuffer(); } }
  const a = new Counted(['original']), b = new Blob(['replacement']), engine = { sha256: 'b'.repeat(64), bytes: 123 };
  const capture = new MixSources();
  capture.record({ a, b: a, rack: engine }, clock(1));
  capture.record({ a, b: a, rack: { ...engine } }, clock(1.1));
  capture.record({ a, b, rack: engine }, clock(1.2));
  capture.record({ a, rack: engine }, clock(1.3));
  assert.equal(reads, 0);
  const value = await capture.finish(receipt);
  assert.equal(reads, 1); assert.equal(value.assets.length, 3); assert.equal(value.snapshots.length, 3);
  assert.equal(value.assets[0].sha256, await sha256(new TextEncoder().encode('original')));
  assert.equal(value.assets[2].sha256, await sha256(new TextEncoder().encode('replacement')));
  assert.equal(value.snapshots[0].a, value.snapshots[0].b);
  assert.equal(value.snapshots.at(-1).b, null);
  assert.equal(value.snapshots[0].context_frame - value.observed_context_start_frame, -128);
  assert.equal(value.training_authorized, false); assert.equal(value.rights_verified, false);
  assert.equal(capture.assets.length, 0);
});

test('empty inventory and generated C/normalized phrase are explicit loaded-source records, never inferred ownership', async () => {
  const capture = new MixSources(); capture.record({}, clock(1));
  capture.record({ c: new Blob(['generated']), phrase: new Blob(['normalized']) }, clock(1.5));
  const value = await capture.finish(receipt);
  assert.equal(value.scope, 'loaded_assets');
  assert.deepEqual(value.assets.map(a => a.kind), ['generated_wav', 'normalized_phrase_wav']);
  assert.deepEqual(value.snapshots[0], { context_frame: 48000, a: null, b: null, c: null, phrase: null, rack: null });
});

test('source byte, asset and timeline caps fail closed without unbounded retention', async () => {
  for (const limit of ['assets', 'timeline', 'bytes']) {
    const capture = new MixSources(), a = new Blob(['a']), b = new Blob(['b']);
    class Large extends Blob { get size() { return 100 * 1024 * 1024; } }
    const count = limit === 'assets' ? 17 : limit === 'timeline' ? 129 : 3;
    for (let i = 0; i < count; i++) {
      capture.record({ a: limit === 'assets' ? new Blob([String(i)]) : limit === 'timeline' ? i % 2 ? a : b : new Large(['small test allocation']) }, clock(1 + i / 100));
      if (i === count - 2) assert.equal(capture.failed, false);
    }
    assert.equal(capture.failed, true); assert.equal(capture.assets.length, 0); assert.equal(capture.snapshots.length, 0);
    await assert.rejects(capture.finish(receipt));
  }
});

test('cancellation while reading releases queued sources and prevents further reads or a late export', async () => {
  let release, reads = 0;
  class Pending extends Blob { arrayBuffer() { return new Promise(resolve => { release = resolve; }); } }
  class Later extends Blob { async arrayBuffer() { reads++; return super.arrayBuffer(); } }
  const capture = new MixSources();
  capture.record({ a: new Pending(['x']), b: new Later(['y']) }, clock(1));
  const pending = capture.finish(receipt);
  capture.cancel(); release(new Uint8Array([120]).buffer);
  await assert.rejects(pending, /cancelled/); assert.equal(reads, 0); assert.equal(capture.assets.length, 0);
});

test('failed or truncated source reads reject provenance and release references', async () => {
  for (const truncated of [false, true]) {
    class Broken extends Blob { async arrayBuffer() { if (truncated) return new ArrayBuffer(0); throw new Error('Read failed'); } }
    const capture = new MixSources(); capture.record({ a: new Broken(['x']) }, clock(1));
    await assert.rejects(capture.finish(receipt), truncated ? /length/ : /Read failed/);
    assert.equal(capture.assets.length, 0); assert.equal(capture.snapshots.length, 0);
  }
});

test('strict source schema rejects forged rights, filenames, wrong linkage, invalid slots, missing assets and reordered clocks', async () => {
  const capture = new MixSources(); capture.record({ a: new Blob(['x']) }, clock(1));
  const value = await capture.finish(receipt);
  for (const change of [{ training_authorized: true }, { rights_verified: true }, { permission: 'licensed' },
    { filename: 'personal.wav' }, { wav_sha256: 'b'.repeat(64) }, { sample_rate: 44100 }, { observed_context_start_frame: 1 },
    { assets: [] }, { snapshots: [] }, { assets: [...value.assets, value.assets[0]] }])
    assert.throws(() => validateMixSources({ ...value, ...change }, receipt));
  for (const change of [{ context_frame: -1 }, { a: 1 }, { a: '0' }, { rack: 0 }, { c: 0 }, { extra: true }])
    assert.throws(() => validateMixSources({ ...value, snapshots: [{ ...value.snapshots[0], ...change }] }, receipt));
  for (const change of [{ kind: 'licensed_music' }, { bytes: 0 }, { sha256: 'x' }, { owner: 'someone' }])
    assert.throws(() => validateMixSources({ ...value, assets: [{ ...value.assets[0], ...change }] }, receipt));
  assert.throws(() => validateMixSources({ ...value, snapshots: [{ ...value.snapshots[0], context_frame: 50000 }, value.snapshots[0]] }, receipt));
  for (const sources of [{ a: {} }, { rack: { bytes: 1, sha256: 'x' } }]) {
    const invalid = new MixSources(); invalid.record(sources, clock(1)); assert.equal(invalid.failed, true);
  }
});

test('additive plan identity binds a saved C to the exact normalized phrase and retains legacy inventories', async () => {
  const phrase=new Blob(['normalized phrase']),sourceHash=await sha256(await phrase.arrayBuffer());
  const plan=new Blob([JSON.stringify({source:{sha256:sourceHash}})]),c=new Blob(['rendered C']);
  const capture=new MixSources();capture.record({},clock(0));capture.record({phrase,plan,c},clock(1));
  const value=await capture.finish(receipt);assert.equal(value.schema_version,'2.0-mix-sources');
  assert.equal(value.snapshots[0].plan,null);
  assert.equal(value.assets[value.snapshots[1].plan].source_sha256,sourceHash);
  const forged=structuredClone(value);forged.assets[value.snapshots[1].plan].source_sha256='f'.repeat(64);
  assert.throws(()=>validateMixSources(forged,receipt),/match/);
  for(const sources of [{phrase,plan:new Blob(['broken']),c},{phrase,plan,c:null},{phrase:new Blob(['other']),plan,c}]){
    const invalid=new MixSources();invalid.record(sources,clock(1));await assert.rejects(invalid.finish(receipt));
  }
});
