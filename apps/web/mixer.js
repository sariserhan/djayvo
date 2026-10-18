export function mixGains(crossfade, levels, master) {
  if (levels.length !== 2 || ![crossfade, ...levels, master].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
    throw new Error('Mixer controls must be between zero and one.');
  // Linear crossfade keeps the summed gain bounded even for identical tracks.
  return [(1 - crossfade) * levels[0] * master * .8, crossfade * levels[1] * master * .8];
}

export function createMixer(context) {
  const channels = [context.createGain(), context.createGain()];
  const meter = context.createAnalyser();
  meter.fftSize = 2048;
  channels.forEach(channel => { channel.gain.value = 0; channel.connect(meter); });
  meter.connect(context.destination);
  const split = context.createChannelSplitter(2);
  meter.connect(split);
  const stereoMeters = [context.createAnalyser(), context.createAnalyser()];
  stereoMeters.forEach((node, channel) => { node.fftSize = 2048; split.connect(node, channel); });
  return { channels, meter, stereoMeters };
}

export function updateMixer(context, mixer, crossfade, levels, master) {
  mixGains(crossfade, levels, master).forEach((gain, index) => {
    mixer.channels[index].gain.setTargetAtTime(gain, context.currentTime, .005);
  });
}

export function validateTrack(file) {
  if (!file.size || file.size > 100 * 1024 * 1024) throw new Error('Choose an audio file between 1 byte and 100 MB.');
  if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(file.name))
    throw new Error('Choose an audio file, such as WAV, MP3 or M4A.');
}

export async function trackDuration(file, signal) {
  const url = URL.createObjectURL(file), audio = new Audio();
  try {
    return await new Promise((resolve, reject) => {
      const finish = error => {
        clearTimeout(timer); signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve(audio.duration);
      };
      const abort = () => finish(new Error('Loading cancelled.'));
      const timer = setTimeout(() => finish(new Error('Audio took too long to open. Try another file.')), 10000);
      signal.addEventListener('abort', abort, { once: true });
      audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration <= 1200
        ? null : new Error('Choose a track no longer than 20 minutes.'));
      audio.onerror = () => finish(new Error('This browser cannot open that file. Try WAV or MP3.'));
      if (signal.aborted) { abort(); return; }
      audio.preload = 'metadata'; audio.src = url;
    });
  } finally { audio.onloadedmetadata = audio.onerror = null; audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}
