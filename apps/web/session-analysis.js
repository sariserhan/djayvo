// Bounded preparation heuristic; suggestions always require performer confirmation.
export function analyzeContext(samples, rate) {
  if (!(samples instanceof Float32Array) || rate !== 8000 || samples.length < rate * 2 || samples.length > rate * 30)
    throw new Error('Context analysis needs 2–30 seconds at 8 kHz.');
  const energy = [], chroma = new Float64Array(12), hop = 40;
  for (let i = 0; i + hop <= samples.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + hop; j++) {
      if (!Number.isFinite(samples[j])) throw new Error('Invalid track samples.');
      sum += samples[j] ** 2;
    }
    energy.push(Math.sqrt(sum / hop));
  }
  const onset = energy.map((n, i) => Math.max(0, n - (energy[i - 1] ?? n)));
  let best = { bpm: 120, confidence: 0 };
  for (let lag = 67; lag <= 200; lag++) {
    let dot = 0, aa = 0, bb = 0;
    for (let i = lag; i < onset.length; i++) { dot += onset[i] * onset[i - lag]; aa += onset[i] ** 2; bb += onset[i - lag] ** 2; }
    const confidence = dot / Math.sqrt(aa * bb || 1);
    if (confidence > best.confidence + .01) best = { bpm: Math.round(120000 / lag) / 10, confidence };
  }
  const size = 1024, window = Float64Array.from({ length: size }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
  for (let start = 0; start + size <= samples.length; start += 1024) {
    for (let note = 48; note < 84; note++) {
      const coefficient = 2 * Math.cos(2 * Math.PI * 440 * 2 ** ((note - 69) / 12) / rate);
      let a = 0, b = 0;
      for (let i = 0; i < size; i++) { const next = samples[start + i] * window[i] + coefficient * a - b; b = a; a = next; }
      chroma[note % 12] += Math.max(0, a * a + b * b - coefficient * a * b);
    }
  }
  const candidates = [];
  for (let tonic = 0; tonic < 12; tonic++) for (const mode of ['minor', 'major']) {
    const third = mode === 'minor' ? 3 : 4;
    candidates.push({ tonic, mode, score: chroma[tonic] + .8 * chroma[(tonic + third) % 12] + .7 * chroma[(tonic + 7) % 12] });
  }
  candidates.sort((a, b) => b.score - a.score);
  return { tempo: best, keys: candidates.slice(0, 3), energy: energy.reduce((a, b) => a + b * b, 0) / energy.length };
}
