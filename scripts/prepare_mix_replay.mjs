// Join existing private downloads without embedding audio, paths, or granting training rights.
import fs from 'node:fs/promises';
import { validateMixReplay } from '../apps/web/mix-replay.js';
const [recording, automation, sources, transport, output, instrument, ...extra] = process.argv.slice(2);
if (!output || extra.length) throw Error('Usage: node scripts/prepare_mix_replay.mjs RECORDING.json CONTROLS.json SOURCES.json TRANSPORT.json NEW_REPLAY.json [INSTRUMENT_TAKE.json]');
async function json(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size < 1 || stat.size > 4 * 1024 * 1024) throw Error('Expected bounded JSON download');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
const take = instrument ? await json(instrument) : null;
if (take && take.schema_version !== '1.1-live-instrument-take') throw Error('Instrument take needs its recorded context clock; capture a new take');
const input = { schema_version: '1.0-mix-replay', recording: await json(recording), automation: await json(automation),
  sources: await json(sources), transport: await json(transport),
  instrument: take ? { take, start_context_frame: take.observed_context_start_frame } : null };
validateMixReplay(input);
await fs.writeFile(output, JSON.stringify(input, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log('Private replay package prepared; supply the exact source files to replay_mix.mjs.');
