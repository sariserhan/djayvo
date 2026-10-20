import { MIX_GAIN_TARGETS, validMixerGain } from './mixer.js';

export const MAX_MIX_ACTIONS = 4096;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const frame = n => Number.isSafeInteger(n) && n >= 0;

export function validateMixAutomation(trace, receipt) {
  if (!exact(trace, ['schema_version', 'scope', 'training_authorized', 'wav_sha256', 'sample_rate',
    'observed_context_start_frame', 'snapshot_context_frame', 'initial_targets', 'events']) ||
    trace.schema_version !== '1.0-mix-gain-automation' || trace.scope !== 'scheduled_gain_eq_targets' ||
    trace.training_authorized !== false || typeof trace.wav_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(trace.wav_sha256) ||
    !Number.isInteger(trace.sample_rate) || trace.sample_rate < 32000 || trace.sample_rate > 192000 ||
    !frame(trace.observed_context_start_frame) ||
    trace.wav_sha256 !== receipt.wav_sha256 || trace.sample_rate !== receipt.sample_rate ||
    trace.observed_context_start_frame !== receipt.observed_context_start_frame ||
    !frame(trace.snapshot_context_frame) || !exact(trace.initial_targets, MIX_GAIN_TARGETS) ||
    !MIX_GAIN_TARGETS.every(target => validMixerGain(target, trace.initial_targets[target])) ||
    !Array.isArray(trace.events) || trace.events.length > MAX_MIX_ACTIONS)
    throw new Error('Invalid mix gain automation');
  let previous = trace.snapshot_context_frame;
  for (const event of trace.events) {
    if (!exact(event, ['context_frame', 'target', 'value']) || !frame(event.context_frame) ||
      event.context_frame < previous || !validMixerGain(event.target, event.value))
      throw new Error('Invalid mix gain automation event');
    previous = event.context_frame;
  }
  return trace;
}

export class MixAutomation {
  constructor(mixer, context) {
    this.initial = { ...mixer.gainTargets };
    this.frame = Math.round(context.currentTime * context.sampleRate);
    this.events = [];
    this.overflow = false;
  }
  record(target, value, contextFrame) {
    if (this.overflow) return;
    if (this.events.length === MAX_MIX_ACTIONS) { this.overflow = true; this.events = []; return; }
    this.events.push({ context_frame: contextFrame, target, value });
  }
  finish(receipt) {
    if (this.overflow) return null;
    // shortcut: scheduled targets exclude transport, FX and ramp history; add those before full mix replay.
    return validateMixAutomation({
      schema_version: '1.0-mix-gain-automation', scope: 'scheduled_gain_eq_targets', training_authorized: false,
      wav_sha256: receipt.wav_sha256, sample_rate: receipt.sample_rate,
      observed_context_start_frame: receipt.observed_context_start_frame,
      snapshot_context_frame: this.frame, initial_targets: this.initial, events: this.events,
    }, receipt);
  }
}
