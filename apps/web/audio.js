export const RATE = 48000;

export async function resumeAudio(context) {
  let timer;
  try {
    await Promise.race([
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Audio did not wake up. Try again, or reload the studio.')), 10000); }),
      context.resume(),
    ]);
    if (context.state !== 'running') throw new Error('Audio is suspended. Try again.');
  } finally { clearTimeout(timer); }
}

export function trimFrames(length, start, end, rate = RATE, extended = false) {
  if (![start, end, rate].every(Number.isFinite) || rate <= 0 || start < 0 || end < start)
    throw new Error('Choose a valid selection within your recording.');
  const first = Math.round(start * rate);
  const count = Math.round((end - start) * rate);
  if (count < (extended?1:2) * rate || count > (extended?15:5) * rate || first + count > length)
    throw new Error(`Choose between ${extended?1:2} and ${extended?15:5} seconds within your recording.`);
  return [first, count];
}

export function encodeWav(samples, start = 0, end = samples.length / RATE, extended = false) {
  const [first, count] = trimFrames(samples.length, start, end, RATE, extended);
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, RATE, true); view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const sample = samples[first + i];
    if (!Number.isFinite(sample)) throw new Error('The recording contains invalid audio.');
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
  }
  return buffer;
}

async function durationOf(blob) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Could not read this audio file. Try WAV or M4A.')), 10000);
      const finish = (error) => { clearTimeout(timer); error ? reject(error) : resolve(audio.duration); };
      audio.onloadedmetadata = () => finish();
      audio.onerror = () => finish(new Error('This browser cannot read that audio format. Try WAV.'));
      audio.preload = 'metadata'; audio.src = url;
    });
  } finally { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}

export async function decodeAudio(blob, recorded = false, minimum = 2) {
  if (![1,2].includes(minimum)) throw new Error('Invalid recording limit.');
  if (!blob.size || blob.size > 8 * 1024 * 1024) throw new Error('Choose an audio file smaller than 8 MB.');
  // Recorded WebM can have no duration metadata. Its capture timer bounds it instead.
  if (!recorded) {
    const duration = await durationOf(blob);
    if (!Number.isFinite(duration) || duration < minimum || duration > 15.01)
      throw new Error(`Import ${minimum}–15 seconds of audio, then select your phrase.`);
  }
  const context = new AudioContext();
  try {
    const input = await context.decodeAudioData(await blob.arrayBuffer());
    if (input.duration < minimum || input.duration > 15.01 || input.numberOfChannels > 2)
      throw new Error(`Use ${minimum}–15 seconds of mono or stereo audio.`);
    const offline = new OfflineAudioContext(1, Math.round(input.duration * RATE), RATE);
    const source = offline.createBufferSource();
    source.buffer = input; source.connect(offline.destination); source.start();
    return (await offline.startRendering()).getChannelData(0).slice();
  } finally { await context.close(); }
}
