import { TAKE_SECONDS, stereoWav, sha256, validateTake } from './live-take.js';
import { resumeAudio } from './audio.js';
import { pairPhrase } from './phrase-pair.js';
export function attachInstrumentTake({ context, getNode, panic, getPhrase = () => null }) {
  const $ = id => document.getElementById(id);
  let state = 'idle', token = 0, timer, started = 0, urls = [];
  let source;
  const sourceAllowed = () => !source || ($('take-include-phrase').checked && source.current());
  function refresh() {
    $('take-start').disabled = state !== 'idle' || !$('take-consent').checked || !getNode();
    $('take-stop').disabled = state !== 'recording';
    $('take-delete').disabled = state === 'idle';
    $('take-start').textContent = state === 'starting' ? 'Preparing…' : 'Record instrument take';
    $('take-include-phrase').disabled = (state !== 'idle' && !source) || !getPhrase();
  }
  function clear(message = 'Take deleted from this tab. Downloaded copies remain on your device.') {
    getNode()?.port.postMessage({ type: 'take-cancel', token }); token++;
    clearInterval(timer); state = 'idle'; source = undefined;
    const player = $('take-player'); player.pause(); player.removeAttribute('src'); player.load(); player.hidden = true;
    for (const id of ['take-wav', 'take-trace', 'take-source', 'take-pair']) { $(id).hidden = true; $(id).removeAttribute('href'); }
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
    if (!sourceAllowed()) { clear('Source permission changed. Paired take discarded.'); return; }
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
        if (version !== token || !$('take-consent').checked || !sourceAllowed()) return;
        const trace = new TextEncoder().encode(JSON.stringify(take, null, 2));
        const paired = source ? await pairPhrase(source, trace) : null;
        if (version !== token || !$('take-consent').checked || !sourceAllowed()) return;
        const files = [['take-wav', wav, 'audio/wav'], ['take-trace', trace, 'application/json']];
        if (paired) files.push(['take-source', paired.wav, 'audio/wav'],
          ['take-pair', JSON.stringify(paired.pair, null, 2), 'application/json']);
        urls = files.map(([id, bytes, type]) => {
          const url = URL.createObjectURL(new Blob([bytes], { type })); $(id).href = url; $(id).hidden = false; return url;
        });
        $('take-player').src = urls[0]; $('take-player').hidden = false;
        state = 'ready'; refresh();
        $('take-status').textContent = `${(data.frames / data.rate).toFixed(1)} seconds · Ready to replay or download.${paired ? ' Source phrase paired; download all four files to keep the link.' : ''} This take stays private.`;
      } catch { if (version === token) clear('Could not validate this take. It was discarded.'); }
    }
  }
  $('take-start').onclick = async () => {
    if (state !== 'idle' || !$('take-consent').checked || !getNode()) return;
    state = 'starting'; const version = ++token; refresh();
    try {
      source = $('take-include-phrase').checked ? getPhrase() : undefined;
      if ($('take-include-phrase').checked && !source) throw new Error('Load a permitted phrase before pairing a take.');
      await resumeAudio(context());
      if (version !== token || !$('take-consent').checked || !sourceAllowed()) return;
      panic();
      getNode().port.postMessage({ type: 'take-start', token, mouth: Number($('mouth').value) });
      timer = setTimeout(() => clear('Capture did not start. Retry when instruments are ready.'), 5000);
    } catch (error) { if (version === token) clear(error.message); }
  };
  $('take-stop').onclick = stop;
  $('take-delete').onclick = () => clear();
  $('take-consent').onchange = () => { if (!$('take-consent').checked) clear('Capture permission removed. Take discarded from this tab.'); else refresh(); };
  $('take-include-phrase').onchange = () => { if (source && !$('take-include-phrase').checked) clear('Source pairing permission removed. Take discarded.'); };
  const sourceChanged = () => {
    if (source && !source.current()) clear('Source changed or permission removed. Paired take discarded.');
    $('take-include-phrase').checked = false; refresh();
  };
  const interrupt = () => { if (['starting', 'recording', 'stopping'].includes(state)) clear('Capture interrupted. Incomplete take discarded.'); };
  window.addEventListener('blur', interrupt);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  window.addEventListener('pagehide', () => clear());
  refresh();
  return { refresh, message, clear, interrupt, sourceChanged };
}
