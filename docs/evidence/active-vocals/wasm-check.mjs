import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import createEngine from '../../../build-web/djayvo_web.mjs';

const root = 'renders/active-vocals-20261019';
const output = await fs.mkdtemp(`${root}/owner-wasm-`);
const cases = [4123, 4124, 4125, 4126].map(seed => ({
  seed, name: `owner-${seed}`, input: 'renders/voice-20261017-221411/source-pcm.wav',
}));
const differences = [];
for (const { seed, name, input } of cases) {
  const engine = await createEngine();
  engine.FS.writeFile('/input.wav', await fs.readFile(input));
  assert.equal(engine.ccall('djayvo_web_render', 'string', ['number', 'number', 'number'], [seed, 3, 1]), '');
  for (const ext of ['wav', 'score.json', 'events.tsv']) {
    const bytes = Buffer.from(engine.FS.readFile(`/mix.call_response.${ext}`));
    await fs.writeFile(`${output}/${name}.call_response.${ext}`, bytes);
    const native = await fs.readFile(`${root}/after/${name}.call_response.${ext}`);
    if (ext !== 'score.json') assert.deepEqual(bytes, native);
    else {
      const { analysis: actual, ...plan } = JSON.parse(bytes);
      const { analysis: expected, ...nativePlan } = JSON.parse(native);
      assert.deepEqual(plan, nativePlan);
      for (const key of Object.keys(expected)) {
        if (typeof expected[key] !== 'number') assert.deepEqual(actual[key], expected[key]);
        else {
          const error = Math.abs(actual[key] - expected[key]);
          assert.ok(Number.isFinite(error) && error <= 1e-12, `${name} ${key}: ${error}`);
          if (error) differences.push({ name, field: key, absolute_error: error });
        }
      }
    }
  }
}
console.log(JSON.stringify({ status: 'PASS', node: process.version, output, cases: cases.length,
  plan_decisions_event_frames_pcm: 'exact', analysis_absolute_tolerance: 1e-12,
  analysis_differences: differences, max_pcm_difference: 0, rms_pcm_difference: 0,
  rendered_browser_interaction: 'NOT RUN' }, null, 2));
