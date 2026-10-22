import { sha256 } from './live-take.js';

const baseSlots = ['a', 'b', 'c', 'phrase', 'rack'];
const kinds = { a: 'local_audio', b: 'local_audio', c: 'generated_wav', phrase: 'normalized_phrase_wav', rack: 'instrument_engine', plan: 'performance_plan' };
const MAX_ASSETS = 16, MAX_SNAPSHOTS = 128, MAX_BYTES = 256 * 1024 * 1024, MAX_FILE = 100 * 1024 * 1024;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const integer = (n, lo, hi = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function validateMixSources(value, receipt) {
  const withPlan=value?.schema_version==='2.0-mix-sources', slots=withPlan?[...baseSlots,'plan']:baseSlots;
  if (!exact(value, ['schema_version', 'scope', 'permission', 'rights_verified', 'training_authorized',
    'wav_sha256', 'sample_rate', 'observed_context_start_frame', 'assets', 'snapshots']) ||
    !['1.0-mix-sources','2.0-mix-sources'].includes(value.schema_version) || value.scope !== 'loaded_assets' ||
    value.permission !== 'user_attested_private_mix' || value.rights_verified !== false || value.training_authorized !== false ||
    !hash(value.wav_sha256) || value.wav_sha256 !== receipt.wav_sha256 ||
    !integer(value.sample_rate, 32000, 192000) || value.sample_rate !== receipt.sample_rate ||
    !integer(value.observed_context_start_frame, 0) || value.observed_context_start_frame !== receipt.observed_context_start_frame ||
    !Array.isArray(value.assets) || value.assets.length > MAX_ASSETS ||
    !Array.isArray(value.snapshots) || !value.snapshots.length || value.snapshots.length > MAX_SNAPSHOTS)
    throw new Error('Invalid mix source inventory');
  let bytes = 0, previous = -1;
  const used = new Set();
  for (const asset of value.assets) {
    if (!exact(asset, ['kind', 'sha256', 'bytes', ...(withPlan&&asset.kind==='performance_plan'?['source_sha256']:[])]) || !Object.values(kinds).includes(asset.kind) ||
      !hash(asset.sha256) || !integer(asset.bytes, 1, MAX_FILE)) throw new Error('Invalid mix source asset');
    if(asset.kind==='performance_plan'&&(!withPlan||asset.bytes>4*1024*1024||!hash(asset.source_sha256)))throw Error('Invalid performance plan identity');
    bytes += asset.bytes;
  }
  if (bytes > MAX_BYTES) throw new Error('Mix source byte limit exceeded');
  for (const snapshot of value.snapshots) {
    if (!exact(snapshot, ['context_frame', ...slots]) || !integer(snapshot.context_frame, 0) ||
      snapshot.context_frame < previous) throw new Error('Invalid mix source snapshot');
    for (const slot of slots) {
      const id = snapshot[slot];
      if (id === null) continue;
      if (!integer(id, 0, value.assets.length - 1) || value.assets[id].kind !== kinds[slot])
        throw new Error('Invalid mix source reference');
      used.add(id);
    }
    if(withPlan&&snapshot.plan!==null&&(snapshot.c===null||snapshot.phrase===null||
      value.assets[snapshot.plan].source_sha256!==value.assets[snapshot.phrase].sha256))throw Error('Performance plan does not match the captured phrase');
    previous = snapshot.context_frame;
  }
  if (used.size !== value.assets.length) throw new Error('Unreferenced mix source asset');
  return value;
}

export class MixSources {
  constructor() { this.assets = []; this.snapshots = []; this.cancelled = false; this.failed = false; }
  cancel() { this.cancelled = true; this.assets.length = 0; this.snapshots = []; }
  record(sources, context) {
    if (this.cancelled || this.failed) return;
    try {
      if(Object.hasOwn(sources,'plan')&&!this.withPlan){this.withPlan=true;for(const old of this.snapshots)old.plan=null;}
      const slots=this.withPlan?[...baseSlots,'plan']:baseSlots;
      const snapshot = { context_frame: Math.round(context.currentTime * context.sampleRate) };
      for (const slot of slots) {
        const source = sources[slot];
        if (!source) { snapshot[slot] = null; continue; }
        const engine = slot === 'rack', bytes = engine ? source.bytes : source.size;
        if (!integer(bytes, 1, slot==='plan'?4*1024*1024:MAX_FILE) || (engine ? !hash(source.sha256) : !(source instanceof Blob)))
          throw new Error('Invalid source');
        let index = this.assets.findIndex(asset => asset.kind === kinds[slot] &&
          (engine ? asset.sha256 === source.sha256 && asset.bytes === bytes : asset.blob === source));
        if (index < 0) {
          if (this.assets.length === MAX_ASSETS || bytes + this.assets.reduce((sum, asset) => sum + asset.bytes, 0) > MAX_BYTES)
            throw new Error('Source asset limit reached');
          index = this.assets.length;
          this.assets.push({ kind: kinds[slot], bytes, ...(engine ? { sha256: source.sha256 } : { blob: source }) });
        }
        snapshot[slot] = index;
      }
      const last = this.snapshots.at(-1);
      if (last && slots.every(slot => last[slot] === snapshot[slot])) return;
      if (this.snapshots.length === MAX_SNAPSHOTS || !integer(snapshot.context_frame, 0) ||
        (last && snapshot.context_frame < last.context_frame)) throw new Error('Source timeline limit reached');
      this.snapshots.push(snapshot);
    } catch { this.failed = true; this.assets = []; this.snapshots = []; }
  }
  async finish(receipt) {
    if (this.cancelled || this.failed) throw new Error('Source inventory incomplete');
    const assets = [];
    try {
      // Hash one bounded immutable Blob at a time, after audio capture has finished.
      for (const asset of this.assets) {
        if (this.cancelled) throw new Error('Source inventory cancelled');
        let digest = asset.sha256, sourceHash;
        if (!digest) {
          const bytes = await asset.blob.arrayBuffer();
          if (this.cancelled) throw new Error('Source inventory cancelled');
          if (bytes.byteLength !== asset.bytes) throw new Error('Source read length changed');
          digest = await sha256(bytes);
          if(asset.kind==='performance_plan'){sourceHash=JSON.parse(new TextDecoder().decode(bytes))?.source?.sha256;if(!hash(sourceHash))throw Error('Missing source identity in plan');}
        }
        if (this.cancelled) throw new Error('Source inventory cancelled');
        assets.push({ kind: asset.kind, bytes: asset.bytes, sha256: digest, ...(asset.kind==='performance_plan'?{source_sha256:sourceHash}:{}) });
      }
      return validateMixSources({
        schema_version: this.withPlan?'2.0-mix-sources':'1.0-mix-sources', scope: 'loaded_assets', permission: 'user_attested_private_mix',
        rights_verified: false, training_authorized: false, wav_sha256: receipt.wav_sha256,
        sample_rate: receipt.sample_rate, observed_context_start_frame: receipt.observed_context_start_frame,
        assets, snapshots: this.snapshots,
      }, receipt);
    } finally { this.assets = []; this.snapshots = []; }
  }
}
