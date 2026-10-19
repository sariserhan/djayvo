export function mixGains(crossfade, levels, master) {
  if (levels.length !== 2 || ![crossfade, ...levels, master].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
    throw new Error('Mixer controls must be between zero and one.');
  // Linear crossfade keeps the summed gain bounded even for identical tracks.
  return [(1 - crossfade) * levels[0] * master * .8, crossfade * levels[1] * master * .8];
}

export function updateInstrumentFX(context, fx, tone, echo, milliseconds) {
  if (!Number.isFinite(tone) || tone < 0 || tone > 100 ||
      !Number.isFinite(echo) || echo < 0 || echo > .5 ||
      !Number.isFinite(milliseconds) || milliseconds < 100 || milliseconds > 800)
    throw new Error('Instrument effects are outside their allowed range.');
  const frequency = tone === 100 ? context.sampleRate / 2 : Math.min(context.sampleRate / 2, 200 * 100 ** (tone / 100));
  const now = context.currentTime;
  // WebKit's target smoothing skews stereo channels during a filter sweep.
  const heldFrequency = fx.input.frequency.value;
  fx.input.frequency.cancelScheduledValues(now);
  fx.input.frequency.setValueAtTime(heldFrequency, now);
  fx.input.frequency.exponentialRampToValueAtTime(frequency, now + .03);
  fx.dry.gain.setTargetAtTime(1 - echo, now, .01);
  fx.wet.gain.setTargetAtTime(echo, now, .01);
  fx.delays.forEach((delay, i) => delay.delayTime.setTargetAtTime(milliseconds * (i + 1) / 1000, now, .03));
}

export function createMixer(context) {
  const channels = [context.createGain(), context.createGain()];
  const meter = context.createAnalyser();
  meter.fftSize = 2048;
  const limiter = context.createWaveShaper();
  const curve = new Float32Array(8193);
  for (let i = 0; i < curve.length; i++) {
    const x = i * 2 / (curve.length - 1) - 1;
    curve[i] = Math.abs(x) <= .8 ? x : Math.sign(x) * (.8 + .2 * Math.tanh((Math.abs(x) - .8) / .2));
  }
  limiter.curve = curve;
  limiter.connect(meter);
  channels.forEach(channel => { channel.gain.value = 0; channel.connect(limiter); });
  const strips = channels.map(channel => {
    const low = context.createBiquadFilter(), mid = context.createBiquadFilter(), high = context.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = 180;
    mid.type = 'peaking'; mid.frequency.value = 1200; mid.Q.value = .7;
    high.type = 'highshelf'; high.frequency.value = 5000;
    const scope = context.createAnalyser(); scope.fftSize = 2048;
    low.connect(mid); mid.connect(high); high.connect(scope); scope.connect(channel);
    return { input: low, eq: [low, mid, high], scope };
  });
  const rack = context.createGain(); rack.gain.value = 0; rack.connect(limiter);
  const input = context.createBiquadFilter(), dry = context.createGain(), wet = context.createGain();
  input.type = 'lowpass'; input.Q.value = 0; input.frequency.value = context.sampleRate / 2;
  wet.gain.value = 0;
  input.connect(dry); dry.connect(rack);
  wet.connect(rack);
  // Parallel taps avoid the extra render-block delay of a browser feedback cycle.
  const delays = [1, .35, .1225].map((weight, i) => {
    const delay = context.createDelay(2.4), gain = context.createGain();
    delay.delayTime.value = .3 * (i + 1); gain.gain.value = weight / 1.4725;
    input.connect(delay); delay.connect(gain); gain.connect(wet);
    return delay;
  });
  const rackFX = { input, dry, wet, delays };
  meter.connect(context.destination);
  const split = context.createChannelSplitter(2);
  meter.connect(split);
  const stereoMeters = [context.createAnalyser(), context.createAnalyser()];
  stereoMeters.forEach((node, channel) => { node.fftSize = 2048; split.connect(node, channel); });
  return { channels, meter, stereoMeters, strips, rack, rackFX };
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
