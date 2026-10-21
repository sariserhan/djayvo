import { attachStudioView } from './studio-view.js';
import { createMixer, updateMixer, setMixerGain, validateTrack, trackDuration, updateToneEcho, clearEcho } from './mixer.js';
import { attachDeck, playMedia } from './deck-controls.js';
import { attachKeyboard } from './keyboard.js';
import { attachPerformance } from './performance-session.js';
import { attachMixRecording } from './mix-recording.js';
import { resumeAudio } from './audio.js';
import { loadSessions, loadSession, verifySession } from './library.js';
import { deckBridge } from './deck-bridge.js';

const $ = id => document.getElementById(id);
attachStudioView($('dj'), $('studio-fullscreen'), $('studio-view-status'));
const rights = $('music-rights');
const decks = ['a', 'b'].map(id => ({ id, audio: $(`audio-${id}`), url: null, duration: 0, loading: null, revision: 0, starting: false }));
let context, mixer, meterData, audioFailure, session;
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function controls(deck) {
  const { id, audio } = deck;
  const held = deck.prepared || deck.preparing;
  const ready = !!deck.url && rights.checked && !held;
  $(`play-${id}`).disabled = !ready || !!deck.loading || deck.starting;
  $(`play-${id}`).textContent = `${audio.paused ? 'Play' : 'Pause'} ${id.toUpperCase()}`;
  $(`file-${id}`).disabled = held || !rights.checked || !audio.paused || deck.starting || !!deck.loading;
  $(`library-load-${id}`).disabled = $(`file-${id}`).disabled || !$('saved-mix').value;
  $(`clear-${id}`).disabled = !deck.url && !deck.loading;
  $(`seek-${id}`).disabled = !ready || !!deck.loading;
  $(`level-${id}`).disabled = !rights.checked;
  $(`jog-${id}`).closest('.deck').dataset.playing = String(held ? !!deck.sessionPlaying : !audio.paused);
  $(`state-${id}`).textContent = held ? (deck.sessionPlaying ? 'Prepared · playing' : 'Prepared session') : deck.loading ? 'Loading…' : deck.starting ? 'Starting…' : !deck.url ? 'Empty' : audio.ended ? 'Ended' : audio.paused ? 'Ready' : 'Playing';
  $(`seek-${id}`).max = String(deck.duration);
  $(`seek-${id}`).value = String(audio.currentTime || 0);
  for (const name of ['tone', 'echo', 'delay', 'fx-reset']) $(`${name}-${id}`).disabled = !deck.url || !rights.checked || !!deck.loading;
  deck.transportControls?.(ready && !deck.loading && !deck.starting);
  if (deck.prepared) for (let band = 0; band < 3; band++) $(`eq-${id}-${band}`).disabled = !rights.checked;
  $(`time-${id}`).textContent = `${time(deck.prepared ? deck.sessionTime || 0 : audio.currentTime || 0)} / ${time(deck.duration)}`;
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
    setMixerGain(context, mixer, 'c', Number($('c-level').value) * master * .8);
    setMixerGain(context, mixer, 'rack', Number($('rack-level').value) * master);
  }
}

function deckEffects(deck, reset = false) {
  const { id } = deck;
  const fx = mixer?.strips[id === 'a' ? 0 : 1].fx;
  if (reset) {
    $(`tone-${id}`).value = '100'; $(`echo-${id}`).value = '0'; $(`delay-${id}`).value = '300';
    if (fx) clearEcho(context, fx);
  }
  const tone = Number($(`tone-${id}`).value), echo = Number($(`echo-${id}`).value), milliseconds = Number($(`delay-${id}`).value);
  $(`tone-${id}-value`).textContent = tone === 100 ? 'Open' : `${Math.round(200 * 100 ** (tone / 100))} Hz`;
  $(`echo-${id}-value`).textContent = echo ? `${Math.round(echo * 100)}%` : 'Off';
  $(`delay-${id}-value`).textContent = `${milliseconds} ms`;
  if (fx) updateToneEcho(context, fx, tone, echo, milliseconds);
}

function clearDeckEchoes() {
  if (mixer) mixer.strips.forEach(strip => clearEcho(context, strip.fx));
}

function pause(deck) {
  if (deck.id === 'a') session?.stop();
  deck.mediaGain?.gain.setTargetAtTime(0, context.currentTime, .005);
  deck.revision++; deck.starting = false; deck.playRequested = false; deck.audio.pause(); controls(deck);
}

function unload(deck) {
  if (deck.id === 'a') session?.reset();
  deck.file = null; deck.academyAsset = null;
  pause(deck); deck.loading?.abort(); deck.loading = null;
  deck.audio.removeAttribute('src'); deck.audio.load();
  if (deck.url) URL.revokeObjectURL(deck.url);
  deck.url = null; deck.duration = 0; mixRecording.sourcesChanged(); deck.resetTransport?.(); deckEffects(deck, true);
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
    decks.forEach((deck, index) => {
      // Gate native decoder backlog on pause while preserving already-generated effect tails.
      deck.mediaGain = context.createGain(); deck.mediaGain.gain.value = 0;
      context.createMediaElementSource(deck.audio).connect(deck.mediaGain);
      deck.mediaGain.connect(mixer.strips[index].input);
    });
  } catch {
    audioFailure = new Error('Mixer could not initialize. Reload this page before trying again.');
    mixer = null; context?.close().catch(() => {});
    throw audioFailure;
  }
  context.onstatechange = () => {
    if (context.state !== 'running') {
      keyboard.panic(); keyboard.interrupt(); mixRecording.interrupt(); decks.forEach(pause); clearDeckEchoes();
      $('mixer-status').textContent = 'Audio was interrupted. Press Play when you are ready to resume.';
    }
  };
  levels(); decks.forEach(deck => { deck.applyEQ?.(); deckEffects(deck); });
}

function masterControls() {
  for (const id of ['crossfade', 'pause-all']) $(id).disabled = !rights.checked;
  $('master').disabled = !rights.checked && !keyboard.ready();
}
const keyboard = attachKeyboard({ graph: audioGraph, context: () => context, mixer: () => mixer, levels, masterControls, getPhrase: () => session?.phraseSource(), onSourcesChanged: () => mixRecording.sourcesChanged() });
const mixRecording = attachMixRecording({ graph: audioGraph, context: () => context, mixer: () => mixer,
  getSources: () => ({ a: decks[0].file, b: decks[1].file, ...session?.mixSources(), rack: keyboard.sourceAsset() }) });
async function start(deck) {
    const { id, audio } = deck;
    if (!rights.checked || !deck.url || deck.loading || deck.starting || deck.prepared || deck.preparing) return;
    if (!audio.paused) { pause(deck); return; }
    const revision = ++deck.revision;
    deck.starting = true; deck.playRequested = true; controls(deck); $(`error-${id}`).textContent = '';
    try {
      audioGraph(); await resumeAudio(context);
      if (revision !== deck.revision || !rights.checked) return;
      if (context.state !== 'running') throw new Error('Audio is suspended. Press Play to try again.');
      if (audio.ended) audio.currentTime = 0;
      deck.mediaGain.gain.setTargetAtTime(1, context.currentTime, .005);
      await playMedia(audio, () => revision === deck.revision && rights.checked && deck.playRequested);
      if (!rights.checked || !deck.playRequested) audio.pause();
      else if (revision === deck.revision) $('mixer-status').textContent = 'Manual mixing active. Keep this page open and your device awake.';
    } catch (error) {
      if (revision === deck.revision) { pause(deck); $(`error-${id}`).textContent = `Playback could not start: ${error.message}`; }
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

async function loadTrack(deck, getFile) {
  const { id, audio } = deck;
  if (!rights.checked || !audio.paused || deck.starting || deck.loading || deck.prepared || deck.preparing) return;
  $(`error-${id}`).textContent = '';
  const revision = ++deck.revision, controller = new AbortController();
  deck.playRequested = false; deck.loading = controller; controls(deck);
  try {
    const file = await getFile();
    if (!file || revision !== deck.revision || !rights.checked) return;
    validateTrack(file);
    const duration = await trackDuration(file, controller.signal);
    if (revision !== deck.revision || !rights.checked) return;
    // Connect before preloading: Linux WebKit can stall when rerouting decoded media.
    audioGraph();
    const previous = deck.url, url = URL.createObjectURL(file);
    audio.removeAttribute('src'); audio.load();
    deck.file = file; deck.url = url; deck.duration = duration; audio.src = url; mixRecording.sourcesChanged(); deck.resetTransport(); deckEffects(deck, true);
    deck.academyAsset = null;
    if (previous) URL.revokeObjectURL(previous);
    $(`name-${id}`).textContent = file.name;
  } catch (error) {
    if (revision === deck.revision) $(`error-${id}`).textContent = `${error.message}${deck.url ? ' Previous track kept.' : ''}`;
  } finally {
    if (deck.loading === controller) deck.loading = null;
    controls(deck);
  }
}

async function refreshLibrary() {
  $('library-refresh').disabled = true;
  $('saved-mix').replaceChildren(new Option('Choose a saved mix', ''));
  decks.forEach(controls);
  $('library-status').textContent = 'Checking saved mixes…';
  try {
    const sessions = (await loadSessions()).sort((a, b) => b.created - a.created);
    let damaged = 0, count = 0;
    for (const saved of sessions) {
      if (!await verifySession(saved)) { damaged++; continue; }
      for (const file of saved.files.filter(file => file.name.endsWith('.wav'))) {
        const label = `${new Date(saved.created).toLocaleString()} · ${file.name.slice(0, -4).replaceAll('_', ' ')} · take ${saved.seed}`;
        $('saved-mix').append(new Option(label, JSON.stringify([saved.id, file.name]))); count++;
      }
    }
    $('library-status').textContent = `${count} saved mix${count === 1 ? '' : 'es'} on this browser.${damaged ? ` ${damaged} damaged session(s) hidden; manage them in Voice studio.` : ''}`;
  } catch (error) { $('library-status').textContent = error.message; }
  finally { $('library-refresh').disabled = false; decks.forEach(controls); }
}
$('library-refresh').onclick = refreshLibrary;
$('saved-mix').onchange = () => decks.forEach(controls);
for (const deck of decks) {
  const { id, audio } = deck;
  $(`file-${id}`).onchange = event => {
    const file = event.target.files[0]; event.target.value = '';
    if (file) loadTrack(deck, () => file);
  };
  $(`library-load-${id}`).onclick = () => {
    const selected = $('saved-mix').value;
    if (!selected) return;
    loadTrack(deck, async () => {
      const [sessionId, name] = JSON.parse(selected);
      const saved = await loadSession(sessionId);
      if (!saved || !await verifySession(saved)) throw new Error('Saved mix is missing or damaged. Refresh the library.');
      const file = saved.files.find(file => file.name === name && file.name.endsWith('.wav'));
      if (!file) throw new Error('Saved audio is missing. Refresh the library.');
      return new File([file.blob], `jamloom-${saved.seed}-${name}`, { type: 'audio/wav' });
    });
  };
  for (const name of ['tone', 'echo', 'delay']) $(`${name}-${id}`).oninput = () => deckEffects(deck);
  $(`fx-reset-${id}`).onclick = () => deckEffects(deck, true);
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
session = attachPerformance({ deck: decks[0], graph: audioGraph, context: () => context, mixer: () => mixer, pause, controls, rights, onPhraseChanged: () => { keyboard.sourceChanged(); mixRecording.sourceChanged(); }, onSourcesChanged: () => mixRecording.sourcesChanged(), onSaved: () => { if (!$('library-refresh').disabled) refreshLibrary(); } });
$('crossfade').oninput = $('master').oninput = levels;
$('pause-all').onclick = () => { decks.forEach(pause); clearDeckEchoes(); $('mixer-status').textContent = 'All decks paused.'; };
window.addEventListener('pagehide', event => {
  decks.forEach(pause); clearDeckEchoes();
  if (!event.persisted) { decks.forEach(unload); context?.close().catch(() => {}); }
});
const academySamples = new Float32Array(2048);
function academySnapshot() {
  const measure=node=>{if(!node||context?.state!=='running')return {peak:0,rms:0};node.getFloatTimeDomainData(academySamples);
    let peak=0,sum=0;for(const v of academySamples){peak=Math.max(peak,Math.abs(v));sum+=v*v;}return {peak,rms:Math.sqrt(sum/academySamples.length)};};
  const output=measure(mixer?.meter),a=measure(mixer?.strips[0].scope),b=measure(mixer?.strips[1].scope);
  return {t:context?.currentTime??0,a:decks[0].audio.paused?0:a.rms,b:decks[1].audio.paused?0:b.rms,
    x:Number($('crossfade').value),master:Number($('master').value),...output,
    rateA:decks[0].audio.playbackRate,rateB:decks[1].audio.playbackRate,levelA:Number($('level-a').value),levelB:Number($('level-b').value)};
}
const bridge=deckBridge(academySnapshot);
for(const id of ['crossfade','master','level-a','level-b','rate-a','rate-b',...['a','b'].flatMap(d=>['tone','echo','delay',...['eq'].flatMap(p=>[`${p}-${d}-0`,`${p}-${d}-1`,`${p}-${d}-2`])].map(p=>p.startsWith('eq-')?p:`${p}-${d}`))])bridge.bind($(id),'oninput',id==='crossfade'?'crossfader.set':'parameter.set');
for(const id of ['pause-all',...['a','b'].flatMap(d=>['play','cue','set-cue','loop','fx-reset','match','tap','rate-reset',...Array.from({length:4},(_,i)=>`hot-${d}-${i}`)].map(p=>p.startsWith('hot-')?p:`${p}-${d}`))])bridge.bind($(id),'onclick','deck.control');
if((location.pathname.startsWith('/academy/')||location.pathname.startsWith('/academy-offline/'))||new URLSearchParams(location.search).has('academy'))import('./academy-coach.js').then(({attachAcademy})=>attachAcademy({bridge,
  async load(tracks){if(!rights.checked)throw new Error('Confirm the music permission checkbox first.');
   decks.forEach(pause);
   for(let i=0;i<2;i++){const track=tracks[i],response=await fetch(track.url);if(!response.ok)throw new Error('Practice music unavailable. Reconnect to prepare it.');
    const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(sha!==track.sha256)throw new Error('Practice track checksum mismatch.');
    const file=new File([bytes],track.title+'.mp3',{type:'audio/mpeg'});
    await loadTrack(decks[i],()=>file);if(decks[i].file!==file)throw new Error('Practice track could not load.');
    decks[i].academyAsset=track.id;$(`bpm-${decks[i].id}`).value=track.bpm;
   }
  },assets:()=>decks.map(d=>d.academyAsset)})).catch(()=>{$('mixer-status').textContent='Academy could not load. Your local DJ controls remain available.';});
// shortcut: manual A/B remain unsynchronized; unify transport before adding
// live tempo changes or beat loops. Prepared A/C already share the audio clock.
setInterval(() => {
  bridge.sample();
  session.refresh();
  if (!mixer || context.state !== 'running') { $('output-meter').value = 0; $('peak').textContent = 'Silent'; return; }
  let peak = 0;
  for (const node of mixer.stereoMeters) {
    node.getFloatTimeDomainData(meterData);
    for (const value of meterData) peak = Math.max(peak, Math.abs(value));
  }
  $('output-meter').value = Math.min(1, peak);
  $('peak').textContent = peak > .00001 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : 'Silent';
}, 100);
