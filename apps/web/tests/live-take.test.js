import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {StepSequence} from '../step-sequence.js';
import { TakeBuffer, executeCommand, validCommand, validateTake, stereoWav, sha256, replayTake, TAKE_EVENTS } from '../live-take.js';
const wasm = fs.readFileSync(new URL('../../../dist/web/engine/jamloom_live.wasm', import.meta.url));
const module = await WebAssembly.compile(wasm);
function harness() {
  let Processor;
  const messages = [];
  vm.runInNewContext(fs.readFileSync(new URL('../instrument-worklet.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), {
    StepSequence, TakeBuffer, executeCommand, validCommand, WebAssembly, sampleRate: 48000,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (data, transfer = []) =>
      messages.push(structuredClone(data, { transfer })) }; } },
    registerProcessor: (_, cls) => { Processor = cls; },
  });
  const processor = new Processor({ processorOptions: { module } });
  const output = [[new Float32Array(128), new Float32Array(128)]];
  return { processor, messages, send: data => processor.port.onmessage({ data }),
    block: () => processor.process([], output), output };
}
const note = { type: 'note', id: 1, patch: 0, pitch: 60, velocity: 100 };
const makeTrace = async done => ({
  schema_version: '1.0-live-instrument-take', scope: 'dry_instruments', origin: 'unreviewed_live_capture',
  training_authorized: false, engine_sha256: await sha256(wasm),
  wav_sha256: await sha256(stereoWav(done.samples, done.frames, done.rate)), sample_rate: done.rate,
  frames: done.frames, initial_mouth: done.mouth, events: done.events,
});

test('actual worklet acceptance frames and captured PCM replay exactly', async () => {
  const h = harness();
  h.send({ type: 'take-start', token: 1, mouth: .2 });
  h.block(); h.send(note); h.block(); h.block();
  h.send({ type: 'off', id: 1 }); h.block();
  h.send({ type: 'mouth', position: .7 }); h.block();
  h.send({ type: 'take-stop', token: 1 });
  const done = h.messages.at(-1), trace = await makeTrace(done);
  assert.deepEqual(trace.events.map(x => x.frame), [128, 384, 512]);
  assert.equal(done.frames, 640);
  assert.ok(done.samples.some(x => x !== 0));
  assert.equal(h.processor.take, null);
  assert.deepEqual(await replayTake(trace, wasm), stereoWav(done.samples, done.frames, done.rate));
  trace.wav_sha256 = '0'.repeat(64);
  await assert.rejects(replayTake(trace, wasm), /audio differs/);
});
test('rejected voices do not appear as accepted notes', () => {
  const h = harness(); h.send({ type: 'take-start', token: 2, mouth: 0 });
  for (let id = 1; id <= 33; id++) h.send({ ...note, id });
  assert.equal(h.processor.take.events.length, 32);
  assert.equal(h.messages.at(-1).type, 'rejected'); h.block();
});
test('cancel and event overflow discard buffers without disabling live audio', () => {
  const h = harness(); h.send({ type: 'take-start', token: 3, mouth: 0 });
  h.send({ type: 'take-cancel', token: 2 }); assert.ok(h.processor.take);
  h.send({ type: 'take-cancel', token: 3 }); assert.equal(h.processor.take, null);
  h.send({ type: 'take-start', token: 4, mouth: 0 });
  for (let i = 0; i <= TAKE_EVENTS; i++) h.send({ type: 'mouth', position: .5 });
  assert.equal(h.messages.at(-1).type, 'take-failed'); assert.equal(h.processor.take, null);
  h.send(note); h.block(); assert.ok(h.output[0][0].some(x => x !== 0));
});
test('capture has a hard 30-second audio and event boundary', () => {
  const take = new TakeBuffer(32000, 0), samples = new Float32Array(256).fill(.1);
  for (let i = 0; i < 7502; i++) take.copy(samples, 128);
  assert.equal(take.frames, 960000); assert.equal(take.samples.length, 1920000);
  assert.equal(take.accepted(note), true); assert.equal(take.events.length, 0);
});
test('command limits and private take metadata cannot be silently relaxed', async () => {
  for (const command of [{...note, patch: 99}, {...note, id: 0}, {...note, pitch: 1},
    {...note, extra: true}, {...note, patch: 4, pitch: 21}, {...note, patch: 9, pitch: 60},
    {type:'mouth', position:NaN}, {type:'off', id:-1}]) assert.equal(validCommand(command), false);
  const h = harness(); h.send({type:'take-start',token:1,mouth:0}); h.send(note); h.block();
  h.send({type:'take-stop',token:1});
  const original = await makeTrace(h.messages.at(-1));
  for (const changes of [{training_authorized:true}, {frames:48000*31}, {scope:'master_mix'},
    {extra:true}, {events:[{frame:-1,command:note}]}, {events:[{frame:0,command:{...note,extra:true}}]}])
    assert.throws(() => validateTake({...original,...changes}));
  await assert.rejects(replayTake({...original,engine_sha256:'0'.repeat(64)},wasm), /engine hash/);
  assert.throws(() => stereoWav(new Float32Array([NaN,0]),1,48000));
  assert.throws(() => stereoWav(new Float32Array([1.1,0]),1,48000));
});
test('recording is off by default and stale stop cannot export another take', () => {
  const h = harness(); h.send(note); h.block(); assert.equal(h.processor.take, undefined);
  h.send({type:'take-start',token:1,mouth:0}); h.block(); h.send({type:'take-stop',token:2});
  assert.ok(h.processor.take); assert.equal(h.messages.at(-1).type,'take-started');
});
test('real instrument engine sequences notes, stops on panic, and keeps dry captures isolated',()=>{
 const h=harness(),pattern={tempo:113,notes:[60,null,64,null,...Array(12).fill(null)]};
 h.send({type:'sequence-start',pattern,patch:0,velocity:100});assert.equal(h.messages.at(-1).type,'sequence-started');
 let peak=0;for(let i=0;i<100;i++){h.block();for(const value of h.output[0][0]){assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));}}assert.ok(peak>.001);
 h.send({type:'panic'});assert.equal(h.processor.sequence,null);for(let i=0;i<400;i++)h.block();assert.ok(h.output[0][0].every(v=>Math.abs(v)<1e-5));
 h.send({type:'sequence-start',pattern,patch:0,velocity:100});h.send({type:'take-start',token:1,mouth:0});assert.equal(h.processor.sequence,null);
 h.send({type:'sequence-start',pattern,patch:0,velocity:100});assert.equal(h.processor.sequence,null);assert.match(h.messages.at(-1).message,/Finish the dry/);assert.ok(h.processor.take);
});
