import { RATE, encodeWav } from './audio.js';
import { sha256, validateTake } from './live-take.js';

const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === keys.split(',').sort().join(',');
const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const hash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);

export function validatePhrasePair(pair) {
  if (!exact(pair, 'schema_version,training_authorized,review,source,take_sha256,context_at_start') ||
    pair.schema_version !== '1.0-phrase-response' || pair.training_authorized !== false ||
    pair.review !== 'unreviewed' || !hash(pair.take_sha256) ||
    !exact(pair.source, 'wav_sha256,frames,sample_rate,channels,origin,permission') ||
    !hash(pair.source.wav_sha256) || !integer(pair.source.frames, RATE * 2, RATE * 5) ||
    pair.source.sample_rate !== RATE || pair.source.channels !== 1 ||
    !['microphone', 'imported_file'].includes(pair.source.origin) ||
    pair.source.permission !== 'user_attested_local_pairing') throw new Error('Invalid private phrase-response pair');
  const c = pair.context_at_start;
  if (c !== null && (!exact(c, 'tempo_milli_bpm,tonic_midi,mode,beats_per_bar,downbeat_seconds,status') ||
    !integer(c.tempo_milli_bpm, 60000, 180000) || !integer(c.tonic_midi, 60, 71) ||
    !['minor', 'major'].includes(c.mode) || c.beats_per_bar !== 4 ||
    !Number.isFinite(c.downbeat_seconds) || c.downbeat_seconds < 0 || c.downbeat_seconds > 300 ||
    c.status !== 'user_confirmed')) throw new Error('Invalid phrase-response musical context');
  return pair;
}

export async function pairPhrase(source, traceBytes) {
  const wav = encodeWav(source.samples);
  const pair = validatePhrasePair({
    schema_version: '1.0-phrase-response', training_authorized: false, review: 'unreviewed',
    source: { wav_sha256: await sha256(wav), frames: source.samples.length, sample_rate: RATE,
      channels: 1, origin: source.origin, permission: 'user_attested_local_pairing' },
    take_sha256: await sha256(traceBytes), context_at_start: source.context,
  });
  await verifyPhrasePair(pair, wav, traceBytes);
  return { pair, wav };
}

// Hashes bind the decoded mono source to the existing replayable response trace, not legal clearance.
export async function verifyPhrasePair(pair, wav, traceBytes) {
  validatePhrasePair(pair);
  if (wav.byteLength !== 44 + pair.source.frames * 2 || traceBytes.byteLength > 2 * 1024 * 1024 ||
    await sha256(wav) !== pair.source.wav_sha256 || await sha256(traceBytes) !== pair.take_sha256)
    throw new Error('Phrase-response asset mismatch');
  const bytes = new Uint8Array(wav.buffer || wav, wav.byteOffset || 0, wav.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at, count) => new TextDecoder().decode(bytes.subarray(at, at + count));
  if (text(0, 4) !== 'RIFF' || view.getUint32(4, true) !== wav.byteLength - 8 ||
    text(8, 8) !== 'WAVEfmt ' || view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 || view.getUint32(24, true) !== RATE ||
    view.getUint32(28, true) !== RATE * 2 || view.getUint16(32, true) !== 2 ||
    view.getUint16(34, true) !== 16 || text(36, 4) !== 'data' ||
    view.getUint32(40, true) !== pair.source.frames * 2) throw new Error('Invalid paired source WAV');
  return validateTake(JSON.parse(new TextDecoder().decode(traceBytes)));
}
