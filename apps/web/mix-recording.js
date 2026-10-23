import { studioElement as $, onStudioLeave } from './studio-windows.js';
import { TAKE_SECONDS, stereoWav, sha256 } from './live-take.js';
import { MixAutomation } from './mix-automation.js';
import { MixSources } from './mix-sources.js';
import { MixTransport } from './mix-transport.js';
import { MIX_STEMS, stemWav, validateMixStems } from './mix-stems.js';
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

export function attachMixRecording({ graph, context, mixer, getSources, getTransport, getSampler }) {

  let state = 'idle', version = 0, node, sink, nodeError, timer, started, loaded = false, urls = [];
  let sourceCapture, sourceJob, transportCapture;
  function refresh() {
    $('mix-record-start').disabled = state !== 'idle' || !$('mix-record-consent').checked;
    $('mix-record-stems').disabled = state !== 'idle';
    $('mix-record-stop').disabled = state !== 'recording';
    $('mix-record-delete').disabled = state === 'idle';
  }
  function disconnect(completed = false) {
    clearInterval(timer);
    sourceCapture = transportCapture = undefined;
    if (!completed) { sourceJob?.cancel(); sourceJob = undefined; }
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
      for (const source of [...(mixer()?.channels ?? []), mixer()?.performance, mixer()?.rack]) {
        try { source?.disconnect(node); } catch { /* Stems are optional. */ }
      }
      node.disconnect(); sink?.disconnect(); node = sink = undefined;
    }
  }
  function clear(text = 'Mix recording deleted from this tab. Downloaded copies remain on your device.') {
    version++; disconnect(); state = 'idle';
    const player = $('mix-record-player'); player.pause(); player.removeAttribute('src'); player.load(); player.hidden = true;
    for (const id of ['mix-record-wav', 'mix-record-json', 'mix-record-automation', 'mix-record-sources', 'mix-record-transport', 'mix-record-stems-json', ...MIX_STEMS.map(name=>'mix-stem-'+name)]) { $(id).hidden = true; $(id).removeAttribute('href'); }
    urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
    $('mix-record-status').textContent = text; $('mix-stems-status').textContent = ''; refresh();
  }
  function stop() {
    if (state !== 'recording') return;
    clearInterval(timer); state = 'stopping'; refresh();
    $('mix-record-status').textContent = 'Preparing your private WAV…';
    node.port.postMessage({ type: 'stop' });
    timer = setTimeout(() => clear('Recorder did not finish. Recording discarded; playback is unaffected.'), 5000);
  }
  async function publishSources(inventory, receipt, token) {
    let deadline;
    const status = $('mix-record-status').textContent;
    $('mix-record-status').textContent = status + ' Checking source details…';
    try {
      const sources = await Promise.race([inventory.finish(receipt), new Promise((_, reject) => {
        deadline = setTimeout(() => { inventory.cancel(); reject(new Error('Source hashing timed out')); }, 10000);
      })]);
      if (token !== version || !$('mix-record-consent').checked) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(sources, null, 2)], { type: 'application/json' }));
      urls.push(url); $('mix-record-sources').href = url; $('mix-record-sources').hidden = false;
      $('mix-record-status').textContent = status + ' Source details ready.';
    } catch {
      if (token === version) $('mix-record-status').textContent = status + ' Source details unavailable; WAV retained.';
    } finally { clearTimeout(deadline); if (sourceJob === inventory) sourceJob = undefined; }
  }
  async function publishStems(stems, receipt, token) {
    const pending=[];
    try {
      if (!Array.isArray(stems) || stems.length !== 4) throw Error('Missing stems');
      const hashes={};
      for (const [index,name] of MIX_STEMS.entries()) {
        if (token !== version || !$('mix-record-consent').checked) return;
        const wav=stemWav(stems[index],receipt.frames,receipt.sample_rate);
        hashes[name]=await sha256(wav);
        if (token !== version || !$('mix-record-consent').checked) return;
        pending.push(URL.createObjectURL(new Blob([wav],{type:'audio/wav'})));
        stems[index]=null;
      }
      const details=validateMixStems({schema_version:'1.0-mix-stems',scope:'aligned_post_fader_pre_limiter',training_authorized:false,
        wav_sha256:receipt.wav_sha256,sample_rate:receipt.sample_rate,frames:receipt.frames,
        observed_context_start_frame:receipt.observed_context_start_frame,stems:hashes},receipt);
      pending.push(URL.createObjectURL(new Blob([JSON.stringify(details,null,2)],{type:'application/json'})));
      for (const [index,id] of [...MIX_STEMS.map(name=>'mix-stem-'+name),'mix-record-stems-json'].entries()) {
        $(id).href=pending[index]; $(id).hidden=false;
      }
      urls.push(...pending); pending.length=0;
      $('mix-stems-status').textContent='Aligned stems ready. Each contains its channel effects and fader moves, before the master limiter.';
    } catch {
      if (token === version) $('mix-stems-status').textContent='Stems unavailable; the mix WAV is retained.';
    } finally { pending.forEach(url=>URL.revokeObjectURL(url)); }
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
      const includeStems = $('mix-record-stems').checked;
      if (includeStems && context().sampleRate > 96000) throw Error('Stems support up to 96 kHz. Turn off stems to record at this rate.');
      const automation = new MixAutomation(mixer(), context(), getSampler?.());
      const transport = transportCapture = new MixTransport(getTransport, context());
      mixer().automationTrace = automation;
      const inventory = new MixSources();
      sourceCapture = sourceJob = inventory; inventory.record(getSources(), context());
      node = new AudioWorkletNode(context(), 'jamloom-mix-recording', {
        numberOfInputs: includeStems ? 5 : 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
        processorOptions: { stems: includeStems },
      });
      sink = context().createGain(); sink.gain.value = 0;
      mixer().meter.connect(node);
      if (includeStems) [...mixer().channels,mixer().performance,mixer().rack].forEach((source,index)=>source.connect(node,0,index+1));
      node.connect(sink); sink.connect(context().destination);
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
            const movements = transport.finish(receipt);
            urls = [URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })),
              URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }))];
            if (trace) urls.push(URL.createObjectURL(new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' })));
            for (const [i, id] of ['mix-record-wav', 'mix-record-json', 'mix-record-automation'].entries()) { if (urls[i]) { $(id).href = urls[i]; $(id).hidden = false; } }
            if (movements) {
              const url = URL.createObjectURL(new Blob([JSON.stringify(movements, null, 2)], { type: 'application/json' }));
              urls.push(url); $('mix-record-transport').href = url; $('mix-record-transport').hidden = false;
            }
            $('mix-record-player').src = urls[0]; $('mix-record-player').hidden = false;
            state = 'ready'; refresh();
            $('mix-record-status').textContent = `${(data.frames / data.rate).toFixed(1)} seconds · Private studio mix ready.${data.capped ? ' Recording reached its 30-second limit.' : ''}${trace ? '' : automation.overflow ? ' Control trace exceeded its limit and was discarded; WAV retained.' : ' Control trace was incomplete and discarded; WAV retained.'}`;
            if (!movements) $('mix-record-status').textContent += ' Transport history unavailable; WAV retained.';
            void publishSources(inventory, receipt, token);
            if (includeStems) { $('mix-stems-status').textContent='Preparing aligned stems…'; void publishStems(data.stems,receipt,token); }
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
  for (const id of ['phrase-consent']) $(id).addEventListener('change', () => {
    if (!$(id).checked && state !== 'idle') clear('Voice permission removed. Mix recording discarded.');
  });
  const interrupt = () => { if (['starting', 'recording', 'stopping'].includes(state)) clear('Audio or focus interrupted. Incomplete mix recording discarded.'); };
  onStudioLeave(interrupt);
  window.addEventListener('pagehide', () => clear());
  refresh();
  return { interrupt, transportChanged: (target, action) => transportCapture?.record(target, action, getTransport, context()), sourcesChanged: () => sourceCapture?.record(getSources(), context()),
    sourceChanged: () => { if (state !== 'idle') clear('Source phrase changed or deleted. Mix recording discarded.'); } };
}
