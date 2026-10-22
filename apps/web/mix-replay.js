import { validateMixRecording } from './mix-recording.js';
import { validateMixAutomation } from './mix-automation.js';
import { validateMixSources } from './mix-sources.js';
import { validateMixTransport } from './mix-transport.js';
import { validateTake, replayTake, stereoWav, sha256 } from './live-take.js';
import { DeckDSP } from './deck-dsp.js';
import { createMixer, setMixerGain, updateToneEcho, clearEcho } from './mixer.js';
import { updateDeckEffects, clearDeckEffects } from './deck-effects.js';

const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).sort().join(',') === [...keys].sort().join(',');
const integer = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const targets = ['a', 'b', 'c', 'rack'];
// shortcut: observations omit prior DSP and decoder acknowledgments; capture those before promising exact original replay.
export function validateMixReplay(input) {
  if (!exact(input, ['schema_version', 'recording', 'automation', 'sources', 'transport', 'instrument']) ||
      input.schema_version !== '1.0-mix-replay') throw Error('Invalid mix replay package');
  const r = validateMixRecording(input.recording);
  validateMixAutomation(input.automation, r); validateMixSources(input.sources, r); validateMixTransport(input.transport, r);
  if(input.sources.assets.some(asset=>asset.kind==='sampler_audio'))throw Error('Sampler performances are preserved in the recorded WAV and instruments stem. Control replay does not include sampler triggers.');
  if (r.timestamp_discontinuities) throw Error('Discontinuous recording cannot be aligned for replay');
  const start = Math.min(input.automation.snapshot_context_frame, input.sources.snapshots[0].context_frame,
    input.transport.events[0].context_frame);
  const end = r.observed_context_start_frame + r.frames;
  if (!Number.isSafeInteger(end) || start > r.observed_context_start_frame || r.observed_context_start_frame - start > r.sample_rate ||
      input.automation.snapshot_context_frame > r.observed_context_start_frame ||
      input.sources.snapshots[0].context_frame > r.observed_context_start_frame ||
      input.transport.events[0].context_frame > r.observed_context_start_frame ||
      [input.automation.events, input.sources.snapshots, input.transport.events].some(events => events.some(e => e.context_frame > end + r.sample_rate)))
    throw Error('Replay timeline is outside the recording bounds');
  // A loaded bank is not evidence of silence: require its accepted-note trace.
  const banks = input.sources.assets.filter(asset => asset.kind === 'instrument_engine');
  if (banks.length) {
    const instrument = input.instrument;
    if (!exact(instrument, ['take', 'start_context_frame'])) throw Error('Instrument action trace and clock origin required');
    validateTake(instrument.take);
    if (banks.length !== 1 || instrument.take.engine_sha256 !== banks[0].sha256 || instrument.take.sample_rate !== r.sample_rate ||
        !integer(instrument.start_context_frame, 0, start) ||
        (instrument.take.schema_version === '1.1-live-instrument-take' && instrument.take.observed_context_start_frame !== instrument.start_context_frame) ||
        instrument.start_context_frame + instrument.take.frames < end)
      throw Error('Instrument trace must cover the full replay interval with the captured engine');
  } else if (input.instrument !== null) throw Error('Unexpected instrument trace');
  return { start, end, frames: end - start, rate: r.sample_rate };
}

// Inspect PCM before browser decoding, so a compressed/decompression-bomb source cannot allocate unbounded audio.
export function inspectReplayWav(bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 44 || bytes.byteLength > 100 * 1024 * 1024) throw Error('Replay requires bounded PCM WAV sources; compressed audio is not supported');
  const v = new DataView(bytes), text = (p, n) => String.fromCharCode(...new Uint8Array(bytes, p, n));
  if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE' || v.getUint32(4, true) !== bytes.byteLength - 8) throw Error('Invalid replay WAV container');
  let format, data;
  for (let p = 12; p < bytes.byteLength;) {
    if (p + 8 > bytes.byteLength) throw Error('Truncated WAV chunk');
    const size = v.getUint32(p + 4, true), name = text(p, 4), at = p + 8;
    if (at + size + (size % 2) > bytes.byteLength) throw Error('Truncated WAV data');
    if (name === 'fmt ') {
      if (format || size < 16) throw Error('Invalid WAV format chunk');
      format = { code: v.getUint16(at, true), channels: v.getUint16(at + 2, true), rate: v.getUint32(at + 4, true),
        byteRate: v.getUint32(at + 8, true), align: v.getUint16(at + 12, true), bits: v.getUint16(at + 14, true) };
      if (format.code === 0xfffe) {
        const tail = [0,0,16,0,128,0,0,170,0,56,155,113];
        if (size < 40 || v.getUint16(at + 16, true) !== 22 || v.getUint16(at + 18, true) !== format.bits ||
            !tail.every((value, i) => v.getUint8(at + 28 + i) === value) ||
            !(format.channels === 1 ? [0,1,4] : [0,3]).includes(v.getUint32(at + 20, true))) throw Error('Unsupported extensible WAV');
        format.code = v.getUint32(at + 24, true);
      }
    }
    if (name === 'data') { if (data) throw Error('Repeated WAV data'); data = { at, size }; }
    p = at + size + (size % 2);
  }
  if (!format || !data) throw Error('Missing WAV format or data');
  const { code, channels, rate, bits, align, byteRate } = format;
  const frames = data.size / align;
  if (![1, 2].includes(channels) || !integer(rate, 8000, 192000) ||
      !(code === 1 && [16, 24, 32].includes(bits) || code === 3 && bits === 32) ||
      align !== channels * bits / 8 || byteRate !== rate * align ||
      !integer(frames, 1, rate * 300) || frames * channels * 4 > 128 * 1024 * 1024)
    throw Error('Unsupported or oversized replay PCM');
  for (let p = data.at; p < data.at + data.size && code === 3; p += 4)
    if (!Number.isFinite(v.getFloat32(p, true)) || Math.abs(v.getFloat32(p, true)) > 32) throw Error('Invalid float WAV samples');
  return { channels, rate, frames };
}

function sourceAt(input, frame) {
  let snapshot = input.sources.snapshots[0];
  for (const next of input.sources.snapshots) { if (next.context_frame > frame) break; snapshot = next; }
  return snapshot;
}

export function renderDeckActions(input, slot, decoded, timing) {
  const { start, frames, rate } = timing;
  const output = [new Float32Array(frames), new Float32Array(frames)];
  let dsp, asset, mode, playing = false, cursor = 0;
  const render = end => { if (dsp && end > cursor) dsp.process(output.map(pcm => pcm.subarray(cursor, end))); cursor = end; };
  for (const event of input.transport.events) {
    if (event.target !== slot && event.target !== 'all') continue;
    const at = Math.min(frames, Math.max(0, event.context_frame - start)); render(at);
    if (at === frames) break;
    const state = event.state[slot], id = sourceAt(input, event.context_frame)[slot];
    if (state.mode === 'empty') { dsp = null; asset = null; playing = false; continue; }
    const buffer = decoded.get(id);
    if (!buffer || Math.abs(buffer.duration - state.duration_seconds) > (buffer.replayDurationTolerance ?? 2 / rate)) throw Error('Deck source is missing or does not match its duration');
    const changed = !dsp || asset !== id || mode !== state.mode;
    if (changed) { dsp = new DeckDSP(Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)), rate); asset = id; mode = state.mode; }
    if (changed || event.action === 'seek' || state.playing && !playing || event.action === 'snapshot') dsp.seek(state.position_seconds * rate);
    dsp.speed = state.rate;
    if (dsp.keylock !== state.key_lock) { dsp.keylock = state.key_lock; dsp.seek(dsp.position); }
    dsp.loop = state.loop;
    dsp.loopStart = (state.region_seconds?.[0] ?? 0) * rate;
    dsp.loopEnd = (state.region_seconds?.[1] ?? buffer.duration) * rate;
    if (state.scratching) {
      dsp.scratch = true; dsp.scratchSpeed = state.scratch_speed;
      if (changed || event.action === 'scratch') dsp.scratchFrames = Math.round(rate * .08);
    } else if (dsp.scratch) { dsp.scratch = false; dsp.seek(dsp.position); }
    dsp.playing = state.playing; playing = state.playing;
  }
  render(frames);
  return output;
}

function preparedClips(input, decoded, timing, context, mixer) {
  for (const slot of ['a', 'c']) {
    let current;
    for (const event of input.transport.events) {
      if (!['all', 'prepared'].includes(event.target)) continue;
      const state = event.state.prepared?.[slot] ?? null;
      if (state && current?.start === state.start_frame && current?.end === state.end_frame) continue;
      const now = Math.max(0, event.context_frame - timing.start) / timing.rate;
      if (current) {
        const fade = Math.min(1, Math.max(0, (now - current.at) / .005), Math.max(0, (current.until - now) / .005));
        current.gain.gain.cancelScheduledValues(now); current.gain.gain.setValueAtTime(fade, now);
        current.gain.gain.linearRampToValueAtTime(0, now + .005); current.source.stop(now + .005); current = null;
      }
      if (!state || state.start_frame >= timing.end || state.end_frame <= timing.start) continue;
      const buffer = decoded.get(sourceAt(input, event.context_frame)[slot]);
      if (!buffer || Math.abs(buffer.length - (state.end_frame - state.start_frame)) > 2) throw Error('Prepared source does not match scheduled duration');
      const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer;
      const at = Math.max(0, state.start_frame - timing.start) / timing.rate;
      const offset = Math.max(0, timing.start - state.start_frame) / timing.rate;
      const until = (state.end_frame - timing.start) / timing.rate;
      source.connect(gain); gain.connect(slot === 'a' ? mixer.strips[0].input : mixer.performanceFX.input);
      gain.gain.setValueAtTime(Math.min(1, offset / .005), at);
      if (offset < .005) gain.gain.linearRampToValueAtTime(1, at + .005 - offset);
      gain.gain.setValueAtTime(1, Math.max(at, until - .005)); gain.gain.linearRampToValueAtTime(0, until);
      source.start(at, offset); current = { source, gain, at: at - offset, until, start: state.start_frame, end: state.end_frame };
    }
  }
}

export async function replayMix(input, readAsset, decodeSource = async bytes => bytes) {
  const timing = validateMixReplay(input), decoded = new Map(), bytes = new Map();
  const context = new OfflineAudioContext(2, timing.frames, timing.rate);
  let decodedBytes = 0; const decodedSources = [];
  for (const [index, asset] of input.sources.assets.entries()) {
    const data = await readAsset(asset.sha256);
    if (!(data instanceof ArrayBuffer) || data.byteLength !== asset.bytes || await sha256(data) !== asset.sha256) throw Error('Replay source hash or size mismatch');
    if (['local_audio', 'generated_wav', 'normalized_phrase_wav'].includes(asset.kind)) {
      const canonical = await decodeSource(data, asset);
      const info = inspectReplayWav(canonical);
      const canonicalHash = await sha256(canonical);
      decodedSources.push({source_sha256: asset.sha256, decoded_wav_sha256: canonicalHash, frames: info.frames, sample_rate: info.rate});
      decodedBytes += Math.ceil(info.frames * timing.rate / info.rate) * info.channels * 4;
      if (decodedBytes > 256 * 1024 * 1024) throw Error('Replay decoded sources exceed 256 MiB');
      const buffer = await context.decodeAudioData(canonical.slice(0));
      // MP3 container duration may include encoder padding; the original hash remains mandatory.
      buffer.replayDurationTolerance = canonicalHash === asset.sha256 ? 2 / timing.rate : .1;
      decoded.set(index, buffer);
    } else if (asset.kind === 'performance_plan') {
      if (JSON.parse(new TextDecoder().decode(data))?.source?.sha256 !== asset.source_sha256) throw Error('Plan source identity mismatch');
    } else bytes.set(asset.sha256, data);
  }
  const mixer = createMixer(context);
  for (const [name, value] of Object.entries(input.automation.initial_targets)) { mixer.gainParams[name].value = value; mixer.gainTargets[name] = value; }
  for (const target of targets) {
    const fx = mixer.effects[target], state = input.automation.initial_effects?.[target] ?? { tone: 100, echo: 0, spacing_ms: 300 };
    fx.input.frequency.value = state.tone === 100 ? timing.rate / 2 : Math.min(timing.rate / 2, 200 * 100 ** (state.tone / 100));
    fx.dry.gain.value = 1 - state.echo; fx.wet.gain.value = state.echo;
    fx.delays.forEach((delay, i) => { delay.delayTime.value = state.spacing_ms * (i + 1) / 1000; });
    fx.targets = { ...state }; fx.spacing = state.spacing_ms;
  }
  for (const target of ['a', 'b']) {
    const values = input.automation.initial_deck_effects?.[target];
    if (values) {
      const fx = mixer.deckEffects[target]; updateDeckEffects(context, fx, values);
      for (const name of Object.keys(values)) for (const [mix, value] of [['dry', 1 - values[name]], ['wet', values[name]]]) {
        fx.mixes[name][mix].gain.cancelScheduledValues(0); fx.mixes[name][mix].gain.value = value;
      }
    }
  }
  const play = (pcm, destination, at = 0, offset = 0) => {
    const buffer = context.createBuffer(pcm.length, pcm[0].length, timing.rate);
    pcm.forEach((channel, i) => buffer.copyToChannel(channel, i));
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(destination); source.start(at, offset);
  };
  for (const [index, slot] of ['a', 'b'].entries()) play(renderDeckActions(input, slot, decoded, timing), mixer.strips[index].input);
  preparedClips(input, decoded, timing, context, mixer);
  if (input.instrument) {
    const { take, start_context_frame: origin } = input.instrument;
    const wav = await replayTake(take, bytes.get(take.engine_sha256));
    const buffer = await context.decodeAudioData(wav);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(mixer.rackFX.input);
    source.start(0, (timing.start - origin) / timing.rate);
  }
  // Graph rewiring occurs only at render-quantum boundaries. The receipt declares this rounding.
  const groups = new Map();
  for (const event of input.automation.events) {
    const frame = Math.ceil(Math.max(0, event.context_frame - timing.start) / 128) * 128;
    if (frame >= timing.frames) continue;
    if (!groups.has(frame)) groups.set(frame, []);
    groups.get(frame).push(event);
  }
  const apply = events => { for (const e of events) {
    if (!e.kind || e.kind === 'gain') setMixerGain(context, mixer, e.target, e.value);
    else if (e.kind === 'tone_echo') updateToneEcho(context, mixer.effects[e.target], e.tone, e.echo, e.spacing_ms);
    else if (e.kind === 'clear_echo') clearEcho(context, mixer.effects[e.target]);
    else if (e.kind === 'deck_effects') updateDeckEffects(context, mixer.deckEffects[e.target], { reverb: e.reverb, phaser: e.phaser, flanger: e.flanger });
    else if (e.kind === 'clear_deck_effects') clearDeckEffects(context, mixer.deckEffects[e.target]);
  } };
  apply(groups.get(0) ?? []); groups.delete(0);
  let failure;
  const pending = [...groups].map(([frame, events]) => context.suspend(frame / timing.rate).then(() => {
    try { apply(events); } catch (error) { failure ??= error; }
    return context.resume();
  }));
  const audio = await context.startRendering(); await Promise.all(pending); if (failure) throw failure;
  const first = input.recording.observed_context_start_frame - timing.start;
  const samples = new Float32Array(input.recording.frames * 2);
  for (let i = 0; i < input.recording.frames; i++) for (let c = 0; c < 2; c++) samples[i * 2 + c] = audio.getChannelData(c)[first + i];
  const wav = stereoWav(samples, input.recording.frames, timing.rate);
  return { wav, report: { schema_version: '1.0-mix-replay-result', status: 'PASS', scope: 'observed_action_reconstruction',
    training_authorized: false, source_recording_sha256: input.recording.wav_sha256, replay_wav_sha256: await sha256(wav),
    input_sha256: await sha256(new TextEncoder().encode(JSON.stringify(input))), frames: input.recording.frames, sample_rate: timing.rate,
    exact_recording_match: await sha256(wav) === input.recording.wav_sha256,
    automation_quantum_frames: 128, prior_dsp_history: 'reset', decoded_sources: decodedSources,
    transport: 'Observed frames interpreted by the shared DeckDSP; historical decoder and worklet acceptance timing is not recoverable.' } };
}
