import { MIX_GAIN_TARGETS, validMixerGain, validToneEcho } from './mixer.js';
import { validDeckEffects } from './deck-effects.js';

export const MAX_MIX_ACTIONS = 4096;
const effectTargets = ['a', 'b', 'c', 'rack'];
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const frame = n => Number.isSafeInteger(n) && n >= 0;
const effectState = value => exact(value, ['tone', 'echo', 'spacing_ms']) &&
  validToneEcho(value.tone, value.echo, value.spacing_ms);

export function validateMixAutomation(trace, receipt) {
  const legacy = trace?.schema_version === '1.0-mix-gain-automation';
  const advanced=trace?.schema_version==='3.0-mix-automation';
  if (!exact(trace, ['schema_version', 'scope', 'training_authorized', 'wav_sha256', 'sample_rate',
    'observed_context_start_frame', 'snapshot_context_frame', 'initial_targets', 'events', ...(legacy ? [] : ['initial_effects']),...(advanced?['initial_deck_effects']:[])]) ||
    (legacy ? trace.scope !== 'scheduled_gain_eq_targets' :
      !['2.0-mix-automation','3.0-mix-automation'].includes(trace.schema_version) || trace.scope !== 'scheduled_gain_eq_fx_controls') ||
    trace.training_authorized !== false || typeof trace.wav_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(trace.wav_sha256) ||
    !Number.isInteger(trace.sample_rate) || trace.sample_rate < 32000 || trace.sample_rate > 192000 ||
    !frame(trace.observed_context_start_frame) ||
    trace.wav_sha256 !== receipt.wav_sha256 || trace.sample_rate !== receipt.sample_rate ||
    trace.observed_context_start_frame !== receipt.observed_context_start_frame ||
    !frame(trace.snapshot_context_frame) || !exact(trace.initial_targets, MIX_GAIN_TARGETS) ||
    !MIX_GAIN_TARGETS.every(target => validMixerGain(target, trace.initial_targets[target])) ||
    !Array.isArray(trace.events) || trace.events.length > MAX_MIX_ACTIONS)
    throw new Error('Invalid mix automation');
  if (!legacy && (!exact(trace.initial_effects, effectTargets) ||
    !effectTargets.every(target => effectState(trace.initial_effects[target]))))
    throw new Error('Invalid initial mixer effects');
  if(advanced&&(!exact(trace.initial_deck_effects,['a','b'])||!['a','b'].every(t=>validDeckEffects(trace.initial_deck_effects[t]))))throw Error('Invalid initial deck effects');
  const spacing = legacy ? {} : Object.fromEntries(effectTargets.map(target => [target, trace.initial_effects[target].spacing_ms]));
  let previous = trace.snapshot_context_frame;
  for (const event of trace.events) {
    let valid = false;
    if (legacy || event?.kind === 'gain') {
      valid = exact(event, ['context_frame', 'target', 'value', ...(legacy ? [] : ['kind'])]) &&
        validMixerGain(event.target, event.value);
    } else if (event?.kind === 'tone_echo') {
      valid = exact(event, ['context_frame', 'kind', 'target', 'tone', 'echo', 'spacing_ms', 'held_frequency_hz']) &&
        effectTargets.includes(event.target) && validToneEcho(event.tone, event.echo, event.spacing_ms) &&
        Number.isFinite(event.held_frequency_hz) && event.held_frequency_hz > 0 && event.held_frequency_hz <= trace.sample_rate / 2;
      if (valid) spacing[event.target] = event.spacing_ms;
    } else if (event?.kind === 'clear_echo') {
      valid = exact(event, ['context_frame', 'kind', 'target', 'spacing_ms']) &&
        effectTargets.includes(event.target) && event.spacing_ms === spacing[event.target];
    } else if(advanced&&event?.kind==='deck_effects'){
      valid=exact(event,['context_frame','kind','target','reverb','phaser','flanger'])&&['a','b'].includes(event.target)&&validDeckEffects({reverb:event.reverb,phaser:event.phaser,flanger:event.flanger});
    } else if(advanced&&event?.kind==='clear_deck_effects'){
      valid=exact(event,['context_frame','kind','target'])&&['a','b'].includes(event.target);
    }
    if (!valid || !frame(event.context_frame) || event.context_frame < previous)
      throw new Error('Invalid mix automation event');
    previous = event.context_frame;
  }
  return trace;
}

export class MixAutomation {
  constructor(mixer, context) {
    this.initial = { ...mixer.gainTargets };
    this.effects = Object.fromEntries(effectTargets.map(target => [target, { ...mixer.effects[target].targets }]));
    this.deckEffects=mixer.deckEffects?Object.fromEntries(['a','b'].map(target=>[target,{...mixer.deckEffects[target].targets}])):null;
    this.frame = Math.round(context.currentTime * context.sampleRate);
    this.events = [];
    this.overflow = false;
    this.invalid = false;
  }
  record(target, value, contextFrame) {
    this.append({ kind: 'gain', context_frame: contextFrame, target, value });
  }
  invalidate() { this.invalid = true; this.events = []; }
  append(event) {
    if (this.overflow || this.invalid) return;
    if (this.events.length === MAX_MIX_ACTIONS) { this.overflow = true; this.events = []; return; }
    this.events.push(event);
  }
  finish(receipt) {
    if (this.overflow || this.invalid) return null;
    // shortcut: transport, source assets and prior DSP history are absent; supply them before full mix replay.
    return validateMixAutomation({
      schema_version: this.deckEffects?'3.0-mix-automation':'2.0-mix-automation', scope: 'scheduled_gain_eq_fx_controls', training_authorized: false,
      wav_sha256: receipt.wav_sha256, sample_rate: receipt.sample_rate,
      observed_context_start_frame: receipt.observed_context_start_frame,
      snapshot_context_frame: this.frame, initial_targets: this.initial, initial_effects: this.effects, events: this.events,
      ...(this.deckEffects?{initial_deck_effects:this.deckEffects}:{}),
    }, receipt);
  }
}
