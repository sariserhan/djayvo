// Compare the instrumental body, ignoring seed, opening, tempo, dynamics and takes.
// shortcut: exact note structure is not perceptual similarity; upgrade after blinded evaluation.
export async function compositionKey(score) {
  const bar = score.ticks_per_quarter * score.time_signature[0] * 4 / score.time_signature[1];
  const notes = score.tracks.flatMap(track => track.events
    .filter(e => e.start_tick >= 2 * bar && e.start_tick < (score.target_bars - 1) * bar)
    .map(e => [track.instrument === 'drums' ? 'drums' : track.instrument === 'bass' ? 'bass' : 'melodic', e.start_tick, e.duration_ticks,
      e.note - (track.instrument === 'drums' ? 0 : score.key.tonic_midi)]));
  notes.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
  const bytes = new TextEncoder().encode(JSON.stringify([score.time_signature, score.target_bars, notes]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    n => n.toString(16).padStart(2, '0')).join('');
}

export async function selectFresh(seed, recent, render) {
  if (!Array.isArray(recent) || recent.length > 30 || recent.some(key => !/^[a-f0-9]{64}$/.test(key)))
    throw new Error('Invalid recent composition history.');
  for (let attempt = 1; attempt <= 8; attempt++) {
    const scores = await render(seed);
    const keys = await Promise.all(scores.map(compositionKey));
    if (keys.every(key => !recent.includes(key))) return { seed, attempts: attempt };
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  }
  throw new Error('These takes repeat a recent composition. Try another direction or recording. Your saved mixes are safe.');
}
