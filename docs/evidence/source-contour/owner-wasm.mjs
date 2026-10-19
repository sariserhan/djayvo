import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import createEngine from '../../../renders/source-contour-20261019/candidate/djayvo_web.mjs';
const root='renders/source-contour-20261019', output=await fs.mkdtemp(root+'/owner-wasm-');
const source=await fs.readFile('renders/voice-20261017-221411/source-pcm.wav');
const rows=[];
for(const seed of [4123,4124,4125,4126]) {
  const engine=await createEngine();engine.FS.writeFile('/input.wav',source);
  const start=performance.now();
  assert.equal(engine.ccall('djayvo_web_render','string',['number','number','number'],[seed,3,1]),'');
  for(const ext of ['wav','score.json','events.tsv']) {
    const bytes=Buffer.from(engine.FS.readFile('/mix.call_response.'+ext));
    await fs.writeFile(`${output}/owner-${seed}.call_response.${ext}`,bytes);
    assert.deepEqual(bytes,await fs.readFile(`${root}/after/owner-${seed}.call_response.${ext}`));
  }
  rows.push({seed,seconds:(performance.now()-start)/1000,plan_event_frames_pcm:'PASS',max_pcm_difference:0,rms_pcm_difference:0});
}
await fs.writeFile('docs/evidence/source-contour/owner-wasm.json',JSON.stringify({node:process.version,cases:rows},null,2)+'\n');
console.log('PASS: four owner native/WASM plans, event traces and PCM exactly equal');
