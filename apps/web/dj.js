import { createMixer, updateMixer, validateTrack, trackDuration } from './mixer.js';
import { attachDeck } from './deck-controls.js';
import { attachKeyboard } from './keyboard.js';

const $ = id => document.getElementById(id);
const rights = $('music-rights');
const decks = ['a', 'b'].map(id => ({ id, audio: $(`audio-${id}`), url: null, duration: 0, loading: null, revision: 0, starting: false }));
let context, mixer, meterData, audioFailure;
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function controls(deck) {
  const { id, audio } = deck;
  const ready = !!deck.url && rights.checked;
  $(`play-${id}`).disabled = !ready || !!deck.loading || deck.starting;
  $(`play-${id}`).textContent = `${audio.paused ? 'Play' : 'Pause'} ${id.toUpperCase()}`;
  $(`file-${id}`).disabled = !rights.checked || !audio.paused || deck.starting || !!deck.loading;
  $(`clear-${id}`).disabled = !deck.url && !deck.loading;
  $(`seek-${id}`).disabled = !ready || !!deck.loading;
  $(`level-${id}`).disabled = !rights.checked;
  $(`state-${id}`).textContent = deck.loading ? 'Loading…' : deck.starting ? 'Starting…' : !deck.url ? 'Empty' : audio.ended ? 'Ended' : audio.paused ? 'Ready' : 'Playing';
  $(`seek-${id}`).max = String(deck.duration);
  $(`seek-${id}`).value = String(audio.currentTime || 0);
  deck.transportControls?.(ready && !deck.loading && !deck.starting);
  $(`time-${id}`).textContent = `${time(audio.currentTime || 0)} / ${time(deck.duration)}`;
}

function levels() {
  const blend = Number($('crossfade').value), master = Number($('master').value);
  const values = decks.map(deck => Number($(`level-${deck.id}`).value));
  $('blend-value').textContent = `A ${Math.round((1 - blend) * 100)}% · B ${Math.round(blend * 100)}%`;
  $('master-value').textContent = `${Math.round(master * 100)}%`;
  decks.forEach((deck, i) => { $(`level-value-${deck.id}`).textContent = `${Math.round(values[i] * 100)}%`; });
  $('rack-value').textContent = `${Math.round(Number($('rack-level').value) * 100)}%`;
  if (mixer) {
    updateMixer(context, mixer, blend, values, master);
    mixer.rack.gain.setTargetAtTime(Number($('rack-level').value) * master, context.currentTime, .005);
  }
}

function pause(deck) {
  deck.revision++; deck.starting = false; deck.playRequested = false; deck.audio.pause(); controls(deck);
}

function unload(deck) {
  pause(deck); deck.loading?.abort(); deck.loading = null;
  deck.audio.removeAttribute('src'); deck.audio.load();
  if (deck.url) URL.revokeObjectURL(deck.url);
  deck.url = null; deck.duration = 0; deck.resetTransport?.();
  $(`file-${deck.id}`).value = '';
  $(`name-${deck.id}`).textContent = deck.id === 'a' ? 'Choose your opening track' : 'Choose what comes next';
  $(`error-${deck.id}`).textContent = '';
  controls(deck);
}

function audioGraph() {
  if (audioFailure) throw audioFailure;
  if (context) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('Web Audio is unavailable. Try a current browser on this device.');
  try {
    context = new Audio({ latencyHint: 'interactive' });
    mixer = createMixer(context); meterData = new Float32Array(mixer.meter.fftSize);
    decks.forEach((deck, index) => context.createMediaElementSource(deck.audio).connect(mixer.strips[index].input));
  } catch {
    audioFailure = new Error('Mixer could not initialize. Reload this page before trying again.');
    mixer = null; context?.close().catch(() => {});
    throw audioFailure;
  }
  context.onstatechange = () => {
    if (context.state !== 'running') {
      keyboard.panic(); decks.forEach(pause);
      $('mixer-status').textContent = 'Audio was interrupted. Press Play when you are ready to resume.';
    }
  };
  levels(); decks.forEach(deck => deck.applyEQ?.());
}

function masterControls() {
  for (const id of ['crossfade', 'pause-all']) $(id).disabled = !rights.checked;
  $('master').disabled = !rights.checked && !keyboard.ready();
}
const keyboard = attachKeyboard({ graph: audioGraph, context: () => context, mixer: () => mixer, levels, masterControls });
async function start(deck) {
    const { id, audio } = deck;
    if (!rights.checked || !deck.url || deck.loading || deck.starting) return;
    if (!audio.paused) { pause(deck); return; }
    const revision = ++deck.revision;
    deck.starting = true; deck.playRequested = true; controls(deck); $(`error-${id}`).textContent = '';
    try {
      audioGraph(); await context.resume();
      if (revision !== deck.revision || !rights.checked) return;
      if (context.state !== 'running') throw new Error('Audio is suspended. Press Play to try again.');
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
      if (!rights.checked || !deck.playRequested) audio.pause();
      else if (revision === deck.revision) $('mixer-status').textContent = 'Manual mixing active. Keep this page open and your device awake.';
    } catch (error) {
      if (revision === deck.revision) { deck.playRequested = false; audio.pause(); $(`error-${id}`).textContent = `Playback could not start: ${error.message}`; }
    } finally {
      if (revision === deck.revision) deck.starting = false;
      controls(deck);
    }
}

rights.onchange = () => {
  if (!rights.checked) decks.forEach(unload);
  masterControls();
  decks.forEach(controls);
  $('mixer-status').textContent = rights.checked ? 'Load your tracks. Start A, then bring B into the blend.' : 'Confirm your music permissions to load tracks.';
};

for (const deck of decks) {
  const { id, audio } = deck;
  $(`file-${id}`).onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !rights.checked || !audio.paused || deck.starting || deck.loading) return;
    $(`error-${id}`).textContent = '';
    const revision = ++deck.revision, controller = new AbortController();
    deck.playRequested = false; deck.loading = controller; controls(deck);
    try {
      validateTrack(file);
      const duration = await trackDuration(file, controller.signal);
      if (revision !== deck.revision || !rights.checked) return;
      const previous = deck.url, url = URL.createObjectURL(file);
      audio.removeAttribute('src'); audio.load();
      deck.url = url; deck.duration = duration; audio.src = url; deck.resetTransport();
      if (previous) URL.revokeObjectURL(previous);
      $(`name-${id}`).textContent = file.name;
    } catch (error) {
      if (revision === deck.revision) $(`error-${id}`).textContent = `${error.message}${deck.url ? ' Previous track kept.' : ''}`;
    } finally {
      if (deck.loading === controller) deck.loading = null;
      controls(deck);
    }
  };
  $(`play-${id}`).onclick = () => start(deck);
  attachDeck(deck, decks.find(other => other !== deck), { pause, start, mixer: () => mixer, context: () => context });
  $(`clear-${id}`).onclick = () => unload(deck);
  $(`seek-${id}`).oninput = event => {
    if (deck.url && rights.checked) {
      try { audio.currentTime = Math.max(0, Math.min(deck.duration, Number(event.target.value))); }
      catch { $(`error-${id}`).textContent = 'Could not seek yet. Let the track load, then try again.'; }
    }
  };
  $(`level-${id}`).oninput = levels;
  for (const event of ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata']) audio.addEventListener(event, () => controls(deck));
  audio.addEventListener('error', () => {
    if (deck.url) { pause(deck); $(`error-${id}`).textContent = 'Track playback failed. Unload it and try another file.'; }
  });
}
$('crossfade').oninput = $('master').oninput = levels;
$('pause-all').onclick = () => { decks.forEach(pause); $('mixer-status').textContent = 'Both decks paused.'; };
window.addEventListener('pagehide', event => {
  decks.forEach(pause);
  if (!event.persisted) { decks.forEach(unload); context?.close().catch(() => {}); }
});
// shortcut: media-element transport is not sample-synchronized; use the shared
// frame clock and AudioWorklet transport before adding beat sync or Deck C.
setInterval(() => {
  if (!mixer || context.state !== 'running') { $('output-meter').value = 0; $('peak').textContent = 'Silent'; return; }
  let peak = 0;
  for (const node of mixer.stereoMeters) {
    node.getFloatTimeDomainData(meterData);
    for (const value of meterData) peak = Math.max(peak, Math.abs(value));
  }
  $('output-meter').value = Math.min(1, peak);
  $('peak').textContent = peak > .00001 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : 'Silent';
}, 100);
