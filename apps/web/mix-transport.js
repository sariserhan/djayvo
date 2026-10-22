import { MAX_MIX_ACTIONS } from './mix-automation.js';

const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const frame = value => Number.isSafeInteger(value) && value >= 0;
const number = (value, lo, hi) => Number.isFinite(value) && value >= lo && value <= hi;
const actions = ['snapshot', 'play', 'pause', 'ended', 'loadedmetadata', 'error', 'seek', 'rate',
  'loop', 'source', 'keylock', 'scratch', 'scratch-end', 'roll', 'prepared'];
function validDeck(state) {
  return exact(state, ['mode', 'duration_seconds', 'position_seconds', 'playing', 'rate', 'loop',
    'region_seconds', 'key_lock', 'scratching', 'scratch_speed', 'roll']) &&
    ['empty', 'media', 'buffer', 'worklet'].includes(state.mode) &&
    number(state.duration_seconds, 0, 1200) && number(state.position_seconds, 0, state.duration_seconds) &&
    (state.mode === 'empty' ? state.duration_seconds === 0 && !state.playing : state.duration_seconds > 0) &&
    ['playing', 'loop', 'key_lock', 'scratching'].every(key => typeof state[key] === 'boolean') &&
    number(state.rate, .84, 1.16) && number(state.scratch_speed, -4, 4) &&
    (!state.scratching || state.mode === 'worklet') && (state.scratching || state.scratch_speed === 0) &&
    (state.region_seconds === null || Array.isArray(state.region_seconds) && state.region_seconds.length === 2 &&
      number(state.region_seconds[0], 0, state.duration_seconds) &&
      number(state.region_seconds[1], 0, state.duration_seconds) && state.region_seconds[0] < state.region_seconds[1]) &&
    (state.roll === null || exact(state.roll, ['position_seconds', 'context_seconds']) &&
      number(state.roll.position_seconds, 0, state.duration_seconds) && number(state.roll.context_seconds, 0, Number.MAX_SAFE_INTEGER));
}
function validPrepared(state) {
  const voice = v => v === null || exact(v, ['start_frame', 'end_frame']) &&
    frame(v.start_frame) && frame(v.end_frame) && v.end_frame > v.start_frame;
  return state === null || exact(state, ['a', 'c', 'tempo_milli_bpm', 'origin_frame']) &&
    voice(state.a) && voice(state.c) && frame(state.origin_frame) &&
    Number.isInteger(state.tempo_milli_bpm) && (state.tempo_milli_bpm === 0 && !state.a ||
      number(state.tempo_milli_bpm, 60000, 180000));
}
function validEvent(event) {
  return exact(event, ['context_frame', 'target', 'action', 'state']) && frame(event.context_frame) &&
    ['a', 'b', 'prepared', 'all'].includes(event.target) && actions.includes(event.action) &&
    exact(event.state, ['a', 'b', 'prepared']) && validDeck(event.state.a) && validDeck(event.state.b) &&
    validPrepared(event.state.prepared);
}
export function validateMixTransport(trace, receipt) {
  if (!exact(trace, ['schema_version', 'scope', 'training_authorized', 'wav_sha256', 'sample_rate',
    'observed_context_start_frame', 'events']) || trace.schema_version !== '1.0-mix-transport' ||
    trace.scope !== 'observed_transport_states' || trace.training_authorized !== false ||
    typeof trace.wav_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(trace.wav_sha256) ||
    trace.wav_sha256 !== receipt.wav_sha256 || !Number.isInteger(trace.sample_rate) ||
    !number(trace.sample_rate, 32000, 192000) || trace.sample_rate !== receipt.sample_rate ||
    !frame(trace.observed_context_start_frame) || trace.observed_context_start_frame !== receipt.observed_context_start_frame ||
    !Array.isArray(trace.events) || !trace.events.length || trace.events.length > MAX_MIX_ACTIONS ||
    trace.events[0]?.action !== 'snapshot' || trace.events[0]?.target !== 'all') throw Error('Invalid mix transport');
  let previous = -1;
  for (const event of trace.events) {
    if (!validEvent(event) || event.context_frame < previous) throw Error('Invalid mix transport event');
    previous = event.context_frame;
  }
  return trace;
}
export class MixTransport {
  constructor(getState, context) {
    this.events = []; this.failed = false;
    this.record('all', 'snapshot', getState, context);
  }
  record(target, action, getState, context) {
    if (this.failed) return;
    try {
      const event = { context_frame: Math.round(context.currentTime * context.sampleRate), target, action,
        state: structuredClone(getState()) };
      if (!validEvent(event) || event.context_frame < (this.events.at(-1)?.context_frame ?? 0) ||
        this.events.length === MAX_MIX_ACTIONS) throw Error('Transport trace incomplete');
      this.events.push(event);
    } catch { this.failed = true; this.events = []; }
  }
  finish(receipt) {
    if (this.failed) return null;
    // shortcut: main-thread observations omit decoder/DSP history; this is not a sample-exact replay plan.
    return validateMixTransport({ schema_version: '1.0-mix-transport', scope: 'observed_transport_states',
      training_authorized: false, wav_sha256: receipt.wav_sha256, sample_rate: receipt.sample_rate,
      observed_context_start_frame: receipt.observed_context_start_frame, events: this.events }, receipt);
  }
}
