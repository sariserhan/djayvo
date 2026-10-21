export const MIX_GAIN_TARGETS = ['a', 'b', 'c', 'rack', 'eq-a-0', 'eq-a-1', 'eq-a-2', 'eq-b-0', 'eq-b-1', 'eq-b-2'];

export function validMixerGain(target, value) {
  return MIX_GAIN_TARGETS.includes(target) && Number.isFinite(value) &&
    (target.startsWith('eq-') ? value >= -12 && value <= 12 : value >= 0 && value <= 1);
}

export function setMixerGain(context, mixer, target, value) {
  if (!validMixerGain(target, value)) throw new Error('Invalid mixer gain target/value.');
  const time = context.currentTime;
  mixer.gainParams[target].setTargetAtTime(value, time, .005);
  mixer.gainTargets[target] = value;
  mixer.automationTrace?.record(target, value, Math.round(time * context.sampleRate));
}

export function mixGains(crossfade, levels, master, curve='linear') {
  if (levels.length !== 2 || ![crossfade, ...levels, master].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
    throw new Error('Mixer controls must be between zero and one.');
  if(!['linear','smooth','cut'].includes(curve))throw new Error('Unknown crossfader curve.');
  if(curve==='smooth')crossfade=crossfade*crossfade*(3-2*crossfade);
  if(curve==='cut')crossfade=Math.max(0,Math.min(1,(crossfade-.45)*10));
  // Linear crossfade keeps the summed gain bounded even for identical tracks.
  return [(1 - crossfade) * levels[0] * master * .8, crossfade * levels[1] * master * .8];
}

export function beatEchoDelay(tempoMilliBpm, division) {
  if (!Number.isInteger(tempoMilliBpm) || tempoMilliBpm < 60000 || tempoMilliBpm > 180000 ||
      !['eighth', 'dotted', 'triplet'].includes(division))
    throw new Error('Beat echo requires a confirmed 60–180 BPM performance and supported division.');
  const beats = division === 'eighth' ? .5 : division === 'dotted' ? .75 : 1 / 3;
  return 60000000 * beats / tempoMilliBpm;
}

export function validToneEcho(tone, echo, milliseconds) {
  return Number.isFinite(tone) && tone >= 0 && tone <= 100 &&
    Number.isFinite(echo) && echo >= 0 && echo <= .5 &&
    Number.isFinite(milliseconds) && milliseconds >= 100 && milliseconds <= 800;
}

export function updateToneEcho(context, fx, tone, echo, milliseconds) {
  if (!validToneEcho(tone, echo, milliseconds))
    throw new Error('Tone/echo controls are outside their allowed range.');
  const frequency = tone === 100 ? context.sampleRate / 2 : Math.min(context.sampleRate / 2, 200 * 100 ** (tone / 100));
  const now = context.currentTime;
  // WebKit's target smoothing skews stereo channels during a filter sweep.
  const heldFrequency = fx.input.frequency.value;
  try {
    fx.input.frequency.cancelScheduledValues(now);
    fx.input.frequency.setValueAtTime(heldFrequency, now);
    fx.input.frequency.exponentialRampToValueAtTime(frequency, now + .03);
    fx.dry.gain.setTargetAtTime(1 - echo, now, .01);
    fx.wet.gain.setTargetAtTime(echo, now, .01);
    fx.delays.forEach((delay, i) => delay.delayTime.setTargetAtTime(milliseconds * (i + 1) / 1000, now, .03));
  } catch (error) { fx.mixer?.automationTrace?.invalidate(); throw error; }
  fx.spacing = milliseconds;
  fx.targets = { tone, echo, spacing_ms: milliseconds };
  fx.mixer?.automationTrace?.append({ kind: 'tone_echo', target: fx.target,
    context_frame: Math.round(now * context.sampleRate), ...fx.targets, held_frequency_hz: heldFrequency });
}

function createToneEcho(context, destination) {
  const input = context.createBiquadFilter(), dry = context.createGain(), wet = context.createGain();
  input.type = 'lowpass'; input.Q.value = 0; input.frequency.value = context.sampleRate / 2;
  wet.gain.value = 0;
  input.connect(dry); dry.connect(destination);
  wet.connect(destination);
  // Parallel taps avoid the extra render-block delay of a browser feedback cycle.
  const send = context.createGain(); input.connect(send);
  const taps = [];
  const delays = [1, .35, .1225].map((weight, i) => {
    const delay = context.createDelay(2.4), gain = context.createGain();
    delay.delayTime.value = .3 * (i + 1); gain.gain.value = weight / 1.4725;
    send.connect(delay); delay.connect(gain); gain.connect(wet);
    taps.push(gain);
    return delay;
  });
  return { input, dry, wet, delays, taps, send, spacing: 300, targets: { tone: 100, echo: 0, spacing_ms: 300 } };
}

export function clearEcho(context, fx) {
  // Replacing delay buffers prevents an old track resurfacing when echo is raised again.
  // Prepared transport releases over 5 ms; keep that stop fade out of the fresh buffers.
  const now = context.currentTime;
  try {
    fx.send.gain.cancelScheduledValues(now);
    fx.send.gain.setValueAtTime(0, now);
    fx.send.gain.setValueAtTime(1, now + .01);
    fx.delays = fx.delays.map((previous, i) => {
      const delay = context.createDelay(2.4);
      // Preserve the requested spacing, not an intermediate value from an interrupted ramp.
      delay.delayTime.value = fx.spacing * (i + 1) / 1000;
      fx.send.disconnect(previous); previous.disconnect();
      fx.send.connect(delay); delay.connect(fx.taps[i]);
      return delay;
    });
  } catch (error) { fx.mixer?.automationTrace?.invalidate(); throw error; }
  fx.mixer?.automationTrace?.append({ kind: 'clear_echo', target: fx.target,
    context_frame: Math.round(now * context.sampleRate), spacing_ms: fx.spacing });
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
    const fx = createToneEcho(context, scope);
    low.connect(mid); mid.connect(high); high.connect(fx.input); scope.connect(channel);
    return { input: low, eq: [low, mid, high], scope, fx };
  });
  const performance = context.createGain(); performance.gain.value = 0; performance.connect(limiter);
  const performanceFX = createToneEcho(context, performance);
  const rack = context.createGain(); rack.gain.value = 0; const rackScope=context.createAnalyser();rackScope.fftSize=2048;rack.connect(rackScope);rackScope.connect(limiter);
  const rackFX = createToneEcho(context, rack);
  meter.connect(context.destination);
  const split = context.createChannelSplitter(2);
  meter.connect(split);
  const stereoMeters = [context.createAnalyser(), context.createAnalyser()];
  stereoMeters.forEach((node, channel) => { node.fftSize = 2048; split.connect(node, channel); });
  const gainParams = { a: channels[0].gain, b: channels[1].gain, c: performance.gain, rack: rack.gain };
  strips.forEach((strip, index) => strip.eq.forEach((filter, band) => { gainParams[`eq-${index ? 'b' : 'a'}-${band}`] = filter.gain; }));
  const gainTargets = Object.fromEntries(MIX_GAIN_TARGETS.map(target => [target, 0]));
  const effects = { a: strips[0].fx, b: strips[1].fx, c: performanceFX, rack: rackFX };
  const mixer = { channels, meter, stereoMeters, strips, rack, rackScope, rackFX, performance, performanceFX, gainParams, gainTargets, effects };
  for (const [target, fx] of Object.entries(effects)) { fx.target = target; fx.mixer = mixer; }
  return mixer;
}

export function updateMixer(context, mixer, crossfade, levels, master, curve='linear') {
  mixGains(crossfade, levels, master,curve).forEach((gain, index) => {
    setMixerGain(context, mixer, index ? 'b' : 'a', gain);
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

export function validatePreparedTrack(buffer) {
  if (buffer.duration < 2 || buffer.duration > 300 || buffer.numberOfChannels > 2 ||
      buffer.length * buffer.numberOfChannels * 4 > 128 * 1024 * 1024)
    throw new Error('Prepared A requires 2 seconds–5 minutes of mono/stereo audio, within 128 MB decoded.');
  for (let channel = 0; channel < buffer.numberOfChannels; channel++)
    for (const sample of buffer.getChannelData(channel))
      if (!Number.isFinite(sample)) throw new Error('The track contains invalid audio samples.');
}
