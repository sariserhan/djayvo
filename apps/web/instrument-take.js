import { TAKE_SECONDS, stereoWav, sha256, validateTake } from './live-take.js';
import { resumeAudio } from './audio.js';
export function attachInstrumentTake({ context, getNode, panic }) {
  const $ = id => document.getElementById(id);
  let state = 'idle', token = 0, timer, started = 0, urls = [];
  function refresh() {
    $('take-start').disabled = state !== 'idle' || !$('take-consent').checked || !getNode();
    $('take-stop').disabled = state !== 'recording';
    $('take-delete').disabled = state === 'idle';
    $('take-start').textContent = state === 'starting' ? 'Preparing…' : 'Record instrument take';
  }
  function clear(message = 'Take deleted from this tab. Downloaded copies remain on your device.') {
    getNode()?.port.postMessage({ type: 'take-cancel', token }); token++;
    clearInterval(timer); state = 'idle';
    const player = $('take-player'); player.pause(); player.removeAttribute('src'); player.load(); player.hidden = true;
    for (const id of ['take-wav', 'take-trace']) { $(id).hidden = true; $(id).removeAttribute('href'); }
    urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
    $('take-status').textContent = message; refresh();
  }
  function stop() {
    if (state !== 'recording') return;
    state = 'stopping'; clearInterval(timer); panic();
    getNode()?.port.postMessage({ type: 'take-stop', token });
    timer = setTimeout(() => clear('Capture did not finish. Take discarded; instruments remain available.'), 5000);
    $('take-status').textContent = 'Preparing your private take…'; refresh();
  }
  async function message(data) {
    if (data.token !== token || !$('take-consent').checked) return;
    if (data.type === 'take-failed') { clear('Capture limit or engine error. Take discarded; try a shorter take.'); return; }
    if (data.type === 'take-started' && state === 'starting') {
      clearInterval(timer); started = performance.now(); state = 'recording'; refresh();
      $('take-status').textContent = 'Recording instruments · 0 / 30 seconds';
      timer = setInterval(() => {
        if (context()?.state !== 'running') { clear('Audio interrupted. Incomplete take discarded.'); return; }
        const seconds = Math.floor((performance.now() - started) / 1000);
        $('take-status').textContent = `Recording instruments · ${seconds} / ${TAKE_SECONDS} seconds`;
        if (seconds >= TAKE_SECONDS) stop();
      }, 200);
    } else if (data.type === 'take-done' && state === 'stopping') {
      clearInterval(timer);
      const version = token;
      try {
        const wav = stereoWav(data.samples, data.frames, data.rate);
        const take = validateTake({ schema_version: '1.0-live-instrument-take', scope: 'dry_instruments',
          origin: 'unreviewed_live_capture', training_authorized: false, engine_sha256: getNode().engineHash,
          wav_sha256: await sha256(wav), sample_rate: data.rate, frames: data.frames,
          initial_mouth: data.mouth, events: data.events });
        if (version !== token || !$('take-consent').checked) return;
        urls = [URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })),
          URL.createObjectURL(new Blob([JSON.stringify(take, null, 2)], { type: 'application/json' }))];
        for (const [i, id] of ['take-wav', 'take-trace'].entries()) { $(id).href = urls[i]; $(id).hidden = false; }
        $('take-player').src = urls[0]; $('take-player').hidden = false;
        state = 'ready'; refresh();
        $('take-status').textContent = `${(data.frames / data.rate).toFixed(1)} seconds · Ready to replay or download. This take stays private.`;
      } catch { if (version === token) clear('Could not validate this take. It was discarded.'); }
    }
  }
  $('take-start').onclick = async () => {
    if (state !== 'idle' || !$('take-consent').checked || !getNode()) return;
    state = 'starting'; const version = ++token; refresh();
    try {
      await resumeAudio(context());
      if (version !== token || !$('take-consent').checked) return;
      panic();
      getNode().port.postMessage({ type: 'take-start', token, mouth: Number($('mouth').value) });
      timer = setTimeout(() => clear('Capture did not start. Retry when instruments are ready.'), 5000);
    } catch (error) { if (version === token) clear(error.message); }
  };
  $('take-stop').onclick = stop;
  $('take-delete').onclick = () => clear();
  $('take-consent').onchange = () => { if (!$('take-consent').checked) clear('Capture permission removed. Take discarded from this tab.'); else refresh(); };
  const interrupt = () => { if (['starting', 'recording', 'stopping'].includes(state)) clear('Capture interrupted. Incomplete take discarded.'); };
  window.addEventListener('blur', interrupt);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  window.addEventListener('pagehide', () => clear());
  refresh();
  return { refresh, message, clear, interrupt };
}
