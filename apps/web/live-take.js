// Shared by the worklet, private take UI and offline replay checks.
export const TAKE_SECONDS = 30, TAKE_EVENTS = 4096;
const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const exactKeys = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).sort().join(',') === [...keys].sort().join(',');
export function validCommand(command) {
  if (command?.type === 'panic') return exactKeys(command, ['type']);
  if (command?.type === 'mouth') return exactKeys(command, ['type', 'position']) &&
    Number.isFinite(command.position) && command.position >= 0 && command.position <= 1;
  if (command?.type === 'off') return exactKeys(command, ['type', 'id']) && integer(command.id, 1, 0xffffffff);
  if (command?.type !== 'note' || !exactKeys(command, ['type', 'id', 'patch', 'pitch', 'velocity'])) return false;
  const { id, patch, pitch, velocity } = command;
  return integer(id, 1, 0xffffffff) && integer(patch, 0, 12) && integer(pitch, 21, 108) && integer(velocity, 1, 127) &&
    (![4, 5].includes(patch) || (pitch >= 40 && pitch <= 79)) &&
    (![9, 10].includes(patch) || [36, 38, 42, 46].includes(pitch)) &&
    (patch !== 12 || [37, 39, 41, 70].includes(pitch));
}
export function executeCommand(engine, command) {
  if (!validCommand(command)) return false;
  if (command.type === 'note') return !!engine.jamloom_live_note(command.id, command.patch, command.pitch, command.velocity);
  if (command.type === 'mouth') return !!engine.jamloom_live_mouth(command.position);
  if (command.type === 'off') engine.jamloom_live_off(command.id);
  else engine.jamloom_live_panic();
  return true;
}
export class TakeBuffer {
  constructor(rate, mouth) {
    if (!integer(rate, 32000, 192000) || !validCommand({ type: 'mouth', position: mouth })) throw new Error('Invalid take setup');
    this.rate = rate; this.mouth = mouth; this.frames = 0; this.count = 0;
    this.commandFrames = new Uint32Array(TAKE_EVENTS);
    this.commandTypes = new Uint8Array(TAKE_EVENTS);
    this.commandData = new Float64Array(TAKE_EVENTS * 4);
    // Allocate only at explicit start, never inside process().
    this.samples = new Float32Array(rate * TAKE_SECONDS * 2);
  }
  accepted(command) {
    if (this.frames >= this.samples.length / 2) return true;
    if (this.count >= TAKE_EVENTS) return false;
    const type = command.type === 'panic' ? 0 : command.type === 'mouth' ? 1 : command.type === 'off' ? 2 : command.type === 'note' ? 3 : -1;
    if (type < 0) return false;
    const index = this.count++, at = index * 4;
    this.commandFrames[index] = this.frames; this.commandTypes[index] = type;
    this.commandData[at] = type === 1 ? command.position : command.id ?? 0;
    this.commandData[at + 1] = command.patch ?? 0; this.commandData[at + 2] = command.pitch ?? 0;
    this.commandData[at + 3] = command.velocity ?? 0;
    return true;
  }
  get events() {
    // Materialize only on export; sequencer callbacks write into fixed buffers.
    return Array.from({ length: this.count }, (_, index) => {
      const at = index * 4, type = this.commandTypes[index], data = this.commandData;
      const command = type === 0 ? { type: 'panic' } : type === 1 ? { type: 'mouth', position: data[at] } :
        type === 2 ? { type: 'off', id: data[at] } : { type: 'note', id: data[at], patch: data[at + 1], pitch: data[at + 2], velocity: data[at + 3] };
      return { frame: this.commandFrames[index], command };
    });
  }
  copy(samples, frames) {
    const count = Math.min(frames, this.samples.length / 2 - this.frames);
    for (let i = 0; i < count * 2; i++) this.samples[this.frames * 2 + i] = samples[i];
    this.frames += count;
  }
}
export function validateTake(take) {
  const clocked = take?.schema_version === '1.1-live-instrument-take';
  if (!exactKeys(take, ['schema_version', 'scope', 'origin', 'training_authorized', 'engine_sha256',
    'wav_sha256', 'sample_rate', 'frames', 'initial_mouth', 'events', ...(clocked ? ['observed_context_start_frame'] : [])]) ||
    !['1.0-live-instrument-take', '1.1-live-instrument-take'].includes(take.schema_version) || take.scope !== 'dry_instruments' ||
    (clocked && (!Number.isSafeInteger(take.observed_context_start_frame) || take.observed_context_start_frame < 0)) ||
    take.origin !== 'unreviewed_live_capture' || take.training_authorized !== false ||
    !/^[a-f0-9]{64}$/.test(take.engine_sha256) || !/^[a-f0-9]{64}$/.test(take.wav_sha256) ||
    !integer(take.sample_rate, 32000, 192000) || !integer(take.frames, 1, take.sample_rate * TAKE_SECONDS) ||
    !validCommand({ type: 'mouth', position: take.initial_mouth }) ||
    !Array.isArray(take.events) || take.events.length > TAKE_EVENTS) throw new Error('Invalid private instrument take');
  let previous = 0;
  for (const event of take.events) {
    if (!exactKeys(event, ['frame', 'command']) || !integer(event.frame, previous, take.frames) ||
      !validCommand(event.command)) throw new Error('Invalid or reordered take event');
    previous = event.frame;
  }
  return take;
}
export function stereoWav(samples, frames, rate) {
  if (!integer(rate, 32000, 192000) || !integer(frames, 1, rate * TAKE_SECONDS) || samples.length < frames * 2)
    throw new Error('Invalid take audio length');
  const bytes = new ArrayBuffer(44 + frames * 4), view = new DataView(bytes);
  const text = (at, str) => { for (let i = 0; i < str.length; i++) view.setUint8(at + i, str.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true);
  view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames * 2; i++) {
    if (!Number.isFinite(samples[i]) || Math.abs(samples[i]) > 1) throw new Error('Invalid or clipped take audio');
    view.setInt16(44 + i * 2, Math.round(samples[i] * 32767), true);
  }
  return bytes;
}
export const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map(x => x.toString(16).padStart(2, '0')).join('');

export async function replayTake(take, wasm) {
  validateTake(take);
  if (await sha256(wasm) !== take.engine_sha256) throw new Error('Take engine hash mismatch');
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const engine = instance.exports; engine._initialize();
  if (!engine.jamloom_live_init(take.sample_rate)) throw new Error('Unsupported take rate');
  engine.jamloom_live_mouth(take.initial_mouth);
  const buffer = new Float32Array(engine.memory.buffer, engine.jamloom_live_buffer(), 4096);
  const samples = new Float32Array(take.frames * 2);
  let frame = 0, index = 0;
  while (frame < take.frames || index < take.events.length) {
    while (index < take.events.length && take.events[index].frame === frame)
      if (!executeCommand(engine, take.events[index++].command)) throw new Error('Recorded command rejected during replay');
    if (frame === take.frames) break;
    const count = Math.min(128, take.frames - frame, index < take.events.length ? take.events[index].frame - frame : 128);
    if (!engine.jamloom_live_render(count)) throw new Error('Take render failed');
    samples.set(buffer.subarray(0, count * 2), frame * 2); frame += count;
  }
  const wav = stereoWav(samples, take.frames, take.sample_rate);
  if (await sha256(wav) !== take.wav_sha256) throw new Error('Take audio differs from recorded performance');
  return wav;
}
