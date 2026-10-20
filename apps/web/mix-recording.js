import { TAKE_SECONDS, stereoWav, sha256 } from './live-take.js';
import { MixAutomation } from './mix-automation.js';
import { resumeAudio } from './audio.js';

export function validateMixRecording(recording) {
  const keys = ['schema_version', 'scope', 'origin', 'training_authorized', 'permission', 'sample_rate',
    'frames', 'wav_sha256', 'observed_context_start_frame', 'timestamp_discontinuities', 'limit_reached'];
  const integer = (v, lo, hi) => Number.isSafeInteger(v) && v >= lo && v <= hi;
  if (!recording || typeof recording !== 'object' || Array.isArray(recording) ||
    Object.keys(recording).sort().join(',') !== keys.sort().join(',') ||
    recording.schema_version !== '1.0-mix-recording' || recording.scope !== 'post_limiter_studio_mix' ||
    recording.origin !== 'unreviewed_live_capture' || recording.training_authorized !== false ||
    recording.permission !== 'user_attested_private_mix' || !integer(recording.sample_rate, 32000, 192000) ||
    !integer(recording.frames, 1, recording.sample_rate * TAKE_SECONDS) ||
    typeof recording.wav_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(recording.wav_sha256) ||
    !integer(recording.observed_context_start_frame, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(recording.timestamp_discontinuities, 0, recording.frames) ||
    recording.limit_reached !== (recording.frames === recording.sample_rate * TAKE_SECONDS))
    throw new Error('Invalid private mix recording');
  return recording;
}

export function attachMixRecording({ graph, context, mixer }) {
  const $ = id => document.getElementById(id);
  let state = 'idle', version = 0, node, sink, nodeError, timer, started, loaded = false, urls = [];
  function refresh() {
    $('mix-record-start').disabled = state !== 'idle' || !$('mix-record-consent').checked;
    $('mix-record-stop').disabled = state !== 'recording';
    $('mix-record-delete').disabled = state === 'idle';
  }
  function disconnect(completed = false) {
    clearInterval(timer);
    if (mixer()) mixer().automationTrace = undefined;
    if (node) {
      const port = node.port;
      node.removeEventListener('processorerror', nodeError);
      // Let the processor release its buffer before closing the cancellation channel.
      port.onmessage = completed ? null : ({ data }) => {
        if (data.type === 'cancelled' || data.type === 'complete') { port.onmessage = null; port.close(); }
      };
      if (completed) port.close(); else port.postMessage({ type: 'cancel' });
      try { mixer()?.meter.disconnect(node); } catch { /* A failed start may not have connected the branch. */ }
      node.disconnect(); sink?.disconnect(); node = sink = undefined;
    }
  }
  function clear(text = 'Mix recording deleted from this tab. Downloaded copies remain on your device.') {
    version++; disconnect(); state = 'idle';
    const player = $('mix-record-player'); player.pause(); player.removeAttribute('src'); player.load(); player.hidden = true;
    for (const id of ['mix-record-wav', 'mix-record-json', 'mix-record-automation']) { $(id).hidden = true; $(id).removeAttribute('href'); }
    urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
    $('mix-record-status').textContent = text; refresh();
  }
  function stop() {
    if (state !== 'recording') return;
    clearInterval(timer); state = 'stopping'; refresh();
    $('mix-record-status').textContent = 'Preparing your private WAV…';
    node.port.postMessage({ type: 'stop' });
    timer = setTimeout(() => clear('Recorder did not finish. Recording discarded; playback is unaffected.'), 5000);
  }
  $('mix-record-start').onclick = async () => {
    if (state !== 'idle' || !$('mix-record-consent').checked) return;
    const token = ++version; state = 'starting'; refresh();
    $('mix-record-status').textContent = 'Starting mix recording…';
    timer = setTimeout(() => clear('Recorder did not load. Recording discarded; playback is unaffected.'), 15000);
    try {
      graph(); await resumeAudio(context());
      if (token !== version) return;
      if (!loaded) { await context().audioWorklet.addModule('./mix-recording-worklet.js'); loaded = true; }
      if (token !== version || !$('mix-record-consent').checked) return;
      const automation = new MixAutomation(mixer(), context());
      mixer().automationTrace = automation;
      node = new AudioWorkletNode(context(), 'jamloom-mix-recording', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
      });
      sink = context().createGain(); sink.gain.value = 0;
      mixer().meter.connect(node); node.connect(sink); sink.connect(context().destination);
      nodeError = () => { if (token === version) clear('Recorder failed. Recording discarded; playback is unaffected.'); };
      node.addEventListener('processorerror', nodeError);
      node.port.onmessage = async ({ data }) => {
        if (token !== version || !$('mix-record-consent').checked) return;
        if (data.type === 'started' && state === 'starting') {
          clearInterval(timer); state = 'recording'; started = performance.now(); refresh();
          $('mix-record-status').textContent = 'Recording studio mix · 0 / 30 seconds';
          timer = setInterval(() => {
            if (context().state !== 'running') { interrupt(); return; }
            const seconds = Math.floor((performance.now() - started) / 1000);
            $('mix-record-status').textContent = `Recording studio mix · ${seconds} / ${TAKE_SECONDS} seconds`;
            if (seconds >= TAKE_SECONDS) stop();
          }, 200);
        } else if (data.type === 'complete' && state === 'stopping') {
          disconnect(true);
          try {
            const wav = stereoWav(data.samples, data.frames, data.rate);
            const receipt = validateMixRecording({ schema_version: '1.0-mix-recording', scope: 'post_limiter_studio_mix',
              origin: 'unreviewed_live_capture', training_authorized: false, permission: 'user_attested_private_mix',
              sample_rate: data.rate, frames: data.frames, wav_sha256: await sha256(wav),
              observed_context_start_frame: data.first, timestamp_discontinuities: data.discontinuities, limit_reached: data.capped });
            if (token !== version || !$('mix-record-consent').checked) return;
            const trace = automation.finish(receipt);
            urls = [URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })),
              URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }))];
            if (trace) urls.push(URL.createObjectURL(new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' })));
            for (const [i, id] of ['mix-record-wav', 'mix-record-json', 'mix-record-automation'].entries()) { if (urls[i]) { $(id).href = urls[i]; $(id).hidden = false; } }
            $('mix-record-player').src = urls[0]; $('mix-record-player').hidden = false;
            state = 'ready'; refresh();
            $('mix-record-status').textContent = `${(data.frames / data.rate).toFixed(1)} seconds · Private studio mix ready.${data.capped ? ' Recording reached its 30-second limit.' : ''}${trace ? '' : automation.overflow ? ' Control trace exceeded its limit and was discarded; WAV retained.' : ' Control trace was incomplete and discarded; WAV retained.'}`;
          } catch { if (token === version) clear('Could not validate the recording. It was discarded.'); }
        }
      };
      clearInterval(timer);
      timer = setTimeout(() => clear('Recorder did not start. Recording discarded; playback is unaffected.'), 5000);
    } catch (error) { if (token === version) clear(`Recording unavailable: ${error.message}`); }
  };
  $('mix-record-stop').onclick = stop; $('mix-record-delete').onclick = () => clear();
  $('mix-record-consent').onchange = () => {
    if (!$('mix-record-consent').checked) clear('Mix recording permission removed. Recording discarded.'); else refresh();
  };
  for (const id of ['music-rights', 'phrase-consent']) $(id).addEventListener('change', () => {
    if (!$(id).checked && state !== 'idle') clear('Music or voice permission removed. Mix recording discarded.');
  });
  const interrupt = () => { if (['starting', 'recording', 'stopping'].includes(state)) clear('Audio or focus interrupted. Incomplete mix recording discarded.'); };
  window.addEventListener('blur', interrupt);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  window.addEventListener('pagehide', () => clear());
  refresh();
  return { interrupt, sourceChanged: () => { if (state !== 'idle') clear('Source phrase changed or deleted. Mix recording discarded.'); } };
}
