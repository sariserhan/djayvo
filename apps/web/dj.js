import { attachStudioAccess } from './studio-access.js';
import './site-announcement.js';
import { attachProConsole } from './pro-console.js';
import { attachSampler } from './sampler.js';
import { practiceFile, partnerFile, isPracticeFile } from './practice-library.js';
import { attachStudioView } from './studio-view.js';
import { createMixer, updateMixer, setMixerGain, validateTrack, trackDuration, validatePreparedTrack, updateToneEcho, clearEcho } from './mixer.js';
import { attachDeck, playMedia } from './deck-controls.js';
import { attachKeyboard } from './keyboard.js';
import { attachPerformance } from './performance-session.js';
import { attachMixRecording } from './mix-recording.js';
import { resumeAudio, encodeWav } from './audio.js';
import { loadSessions, loadSession, verifySession } from './library.js';
import { attachSetRecording } from './set-recording.js';
import { FrameDeck } from './frame-deck.js';
import { deckBridge } from './deck-bridge.js';
import { attachStudioRecovery } from './studio-recovery.js';
import { attachCueRouting } from './cue-routing.js';
import { DECK_EFFECTS, updateDeckEffects, clearDeckEffects } from './deck-effects.js';

const $ = id => document.getElementById(id);
attachStudioView($('dj'), $('studio-fullscreen'), $('studio-view-status'));
attachProConsole();
const access = await attachStudioAccess();
const rights = $('music-rights');
const decks = ['a', 'b'].map(id => ({ id, audio: $(`audio-${id}`), url: null, duration: 0, loading: null, revision: 0, starting: false }));
let context, mixer, meterData, audioFailure, session;
for(const [index,deck] of decks.entries()){deck.media=deck.audio;deck.audio=new FrameDeck(deck.media,()=>context,()=>deck.mediaGain);}
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function controls(deck) {
  const { id, audio } = deck;
  const held = deck.prepared || deck.preparing;
  const ready = !!deck.url && rights.checked && !held;
  $(`play-${id}`).disabled = !ready || !!deck.loading || deck.starting;
  $(`play-${id}`).textContent = `${audio.paused ? 'Play' : 'Pause'} ${id.toUpperCase()}`;
  $(`file-${id}`).disabled = held || !rights.checked || !audio.paused || deck.starting || !!deck.loading;
  $(`practice-load-${id}`).disabled = $(`file-${id}`).disabled || !$('practice-track').value;
  $(`library-load-${id}`).disabled = $(`file-${id}`).disabled || !$('saved-mix').value;
  $(`clear-${id}`).disabled = !deck.url && !deck.loading;
  $(`seek-${id}`).disabled = !ready || !!deck.loading;
  $(`level-${id}`).disabled = !rights.checked;
  $(`jog-${id}`).closest('.deck').dataset.playing = String(held ? !!deck.sessionPlaying : !audio.paused);
  $(`state-${id}`).textContent = held ? (deck.sessionPlaying ? 'Prepared · playing' : 'Prepared session') : deck.loading ? 'Loading…' : deck.starting ? 'Starting…' : !deck.url ? 'Empty' : audio.ended ? 'Ended' : audio.paused ? 'Ready' : 'Playing';
  $(`seek-${id}`).max = String(deck.duration);
  $(`seek-${id}`).value = String(audio.currentTime || 0);
  for (const name of ['tone', 'echo', 'delay', 'fx-reset', ...DECK_EFFECTS]) $(`${name}-${id}`).disabled = !deck.url || !rights.checked || !!deck.loading;
  deck.transportControls?.(ready && !deck.loading && !deck.starting);
  $(`prepare-frames-${id}`).disabled=!ready||!audio.paused||!!deck.loading||deck.starting||!!audio.buffer;
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
    updateMixer(context, mixer, blend, values, master, $('crossfade-curve').value);
    setMixerGain(context, mixer, 'c', Number($('c-level').value) * master * .8);
    setMixerGain(context, mixer, 'rack', Number($('rack-level').value) * master);
  }
}

function deckEffects(deck, reset = false) {
  const { id } = deck;
  const fx = mixer?.strips[id === 'a' ? 0 : 1].fx, advanced=mixer?.deckEffects[id];
  if (reset) {
    $(`tone-${id}`).value = '100'; $(`echo-${id}`).value = '0'; $(`delay-${id}`).value = '300';
    if (fx) clearEcho(context, fx);
    for(const name of DECK_EFFECTS)$(`${name}-${id}`).value='0';
    if(advanced)clearDeckEffects(context,advanced);
  }
  const tone = Number($(`tone-${id}`).value), echo = Number($(`echo-${id}`).value), milliseconds = Number($(`delay-${id}`).value);
  $(`tone-${id}-value`).textContent = tone === 100 ? 'Open' : `${Math.round(200 * 100 ** (tone / 100))} Hz`;
  $(`echo-${id}-value`).textContent = echo ? `${Math.round(echo * 100)}%` : 'Off';
  $(`delay-${id}-value`).textContent = `${milliseconds} ms`;
  if (fx) updateToneEcho(context, fx, tone, echo, milliseconds);
  const values=Object.fromEntries(DECK_EFFECTS.map(name=>[name,Number($(`${name}-${id}`).value)]));
  for(const name of DECK_EFFECTS)$(`${name}-${id}-value`).textContent=values[name]?`${Math.round(values[name]*100)}%`:'Off';
  if(advanced)updateDeckEffects(context,advanced,values);
}

function clearDeckEchoes() {
  if (mixer) mixer.strips.forEach(strip => {clearEcho(context, strip.fx);clearDeckEffects(context,strip.advanced);});
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
      context.createMediaElementSource(deck.media).connect(deck.mediaGain);
      deck.mediaGain.connect(mixer.strips[index].input);
    });
  } catch {
    audioFailure = new Error('Mixer could not initialize. Reload this page before trying again.');
    mixer = null; context?.close().catch(() => {});
    throw audioFailure;
  }
  context.onstatechange = () => {
    if (context.state !== 'running') {
      cueRouting.interrupt(); keyboard.panic(); keyboard.interrupt(); mixRecording.interrupt(); setRecording.interrupt(); decks.forEach(pause); clearDeckEchoes();
      $('mixer-status').textContent = 'Audio was interrupted. Press Play when you are ready to resume.';
    }
  };
  levels(); decks.forEach(deck => { deck.applyEQ?.(); deckEffects(deck); });
}

function masterControls() {
  for (const id of ['crossfade', 'crossfade-curve', 'pause-all']) $(id).disabled = !rights.checked;
  $('master').disabled = !rights.checked && !keyboard.ready();
}
const keyboard = attachKeyboard({ graph: audioGraph, context: () => context, mixer: () => mixer, levels, masterControls, getPhrase: () => session?.phraseSource(), onSourcesChanged: () => mixRecording.sourcesChanged(),onNote:()=>bridge.publish({action:'instrument.note',control:'keyboard',source:'user',t:context.currentTime,value:null}) });
const mixRecording = attachMixRecording({ graph: audioGraph, context: () => context, mixer: () => mixer,
  getSampler:()=>sampler.snapshot(),
  getTransport: () => ({ a: decks[0].audio.transportState(), b: decks[1].audio.transportState(), prepared: session?.transportState() ?? null }),
  getSources: () => ({ a: decks[0].file, b: decks[1].file, ...session?.mixSources(), rack: keyboard.sourceAsset(), ...sampler.sources() }) });
const sampler=attachSampler({graph:audioGraph,context:()=>context,mixer:()=>mixer,rights,onSourcesChanged:()=>mixRecording.sourcesChanged()});
for (const deck of decks) deck.audio.addEventListener('transportchange', event => mixRecording.transportChanged(deck.id, event.action));
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
    const file = await getFile(controller.signal);
    if (!file || revision !== deck.revision || !rights.checked) return;
    if (!access.ownMusic && !isPracticeFile(file)) throw Error('Pro demo uses practice music. Switch to Basic or upgrade to load your tracks.');
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

async function prepareFrames(deck) {
  if(!rights.checked||!deck.file||!deck.audio.paused||deck.loading||deck.prepared||deck.preparing||deck.audio.buffer)return;
  const revision=++deck.revision,file=deck.file;
  deck.preparing=true;controls(deck);
  try{
    audioGraph();
    if(deck.duration<2||deck.duration>300||deck.duration*context.sampleRate*8>128*1024*1024)
      throw Error('Beat controls need a track of 2 seconds–5 minutes within 128 MB decoded. Native playback is still available.');
    const buffer=await context.decodeAudioData(await file.arrayBuffer());validatePreparedTrack(buffer);
    if(revision!==deck.revision||file!==deck.file||!rights.checked)return;
    const position=deck.audio.currentTime,speed=deck.audio.playbackRate;
    const node=await deck.audio.prepareDSP(buffer);
    if(revision!==deck.revision||file!==deck.file||!rights.checked){node.port.postMessage({type:'dispose'});node.port.close();node.disconnect();return;}
    deck.audio.useDSP(buffer,node);deck.audio.currentTime=position;deck.audio.playbackRate=speed;
    deck.audio.loop=deck.loop;deck.duration=buffer.duration;
    $(`error-${deck.id}`).textContent='Beat controls and scratch ready. Enter the track BPM. Enable key lock to preserve pitch when changing tempo.';
  }catch(error){if(revision===deck.revision)$(`error-${deck.id}`).textContent=error.message;}
  finally{deck.preparing=false;controls(deck);}
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
const practiceTracks = [];
function practiceSelection() {
  const track = practiceTracks.find(t => t.id === $('practice-track').value);
  $('practice-credit').replaceChildren();
  if (track) {
    const source = document.createElement('a'); source.href = track.source_page; source.textContent = `${track.title} — ${track.artist}`;
    $('practice-credit').append(source, ` · ${track.genre} · ${track.partner ? 'Aurowall partner music · online' : 'CC0 · '+time(track.seconds)}`);
  }
  decks.forEach(controls);
}
$('practice-track').onchange = practiceSelection;
function addPracticeTracks(tracks,label) {
  const selected=$('practice-track').value;practiceTracks.push(...tracks);
  if(!selected&&!practiceTracks.slice(0,-tracks.length).length)$('practice-track').replaceChildren();
  const group=document.createElement('optgroup');group.label=label;
  group.append(...tracks.map(track=>new Option(`${track.title} — ${track.artist} · ${track.genre}`,track.id)));
  $('practice-track').append(group);if(selected)$('practice-track').value=selected;practiceSelection();
}
fetch(new URL('./practice-audio/manifest.json', import.meta.url)).then(async response => {
  if (!response.ok) throw new Error('Practice list unavailable. Reconnect and reload this page.');
  const manifest = await response.json();addPracticeTracks(manifest.tracks,'CC0 practice music');
  $('practice-status').textContent = `${manifest.tracks.length} CC0 tracks ready. Pause the destination deck before loading. Your current track stays until its replacement is ready.`;
}).catch(error => { $('practice-status').textContent = error.message; });
if (access.mode === 'pro') fetch('/api/aurowall').then(async response=>{
  if(!response.ok)throw Error();const {tracks}=await response.json();
  if(tracks.length)addPracticeTracks(tracks.map(track=>({...track,partner:true,source_page:'https://aurowall.com'})),'Aurowall · online');
  $('aurowall-status').textContent=tracks.length?`${tracks.length} Aurowall tracks available online.`:'No Aurowall tracks are available yet.';
}).catch(()=>{$('aurowall-status').textContent='Aurowall music is unavailable offline or right now. Your CC0 and local tracks still work.';});
if (access.mode !== 'pro') $('aurowall-status').textContent = 'Aurowall music is included with the Pro upgrade. Practice tracks are free.';
$('library-refresh').onclick = refreshLibrary;
$('saved-mix').onchange = () => decks.forEach(controls);
for (const deck of decks) {
  const { id, audio } = deck;
  $(`prepare-frames-${id}`).onclick=()=>prepareFrames(deck);
  $(`practice-load-${id}`).onclick = () => {
    const track = practiceTracks.find(t => t.id === $('practice-track').value);
    if (track) loadTrack(deck, signal => track.partner ? partnerFile(track, signal) : practiceFile(track, signal));
  };
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
  for (const name of ['tone', 'echo', 'delay', ...DECK_EFFECTS]) $(`${name}-${id}`).oninput = () => deckEffects(deck);
  $(`fx-reset-${id}`).onclick = () => deckEffects(deck, true);
  $(`play-${id}`).onclick = () => start(deck);
  attachDeck(deck, decks.find(other => other !== deck), { pause, start, mixer: () => mixer, context: () => context,
    scratchStart:async()=>{await resumeAudio(context);if(rights.checked&&deck.audio.processor)deck.mediaGain.gain.setTargetAtTime(1,context.currentTime,.005);} });
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
session = attachPerformance({ deck: decks[0], graph: audioGraph, context: () => context, mixer: () => mixer, pause, controls, rights, onPhraseChanged: () => { keyboard.sourceChanged(); mixRecording.sourceChanged(); }, onSourcesChanged: () => mixRecording.sourcesChanged(), onTransportChanged: () => mixRecording.transportChanged('prepared', 'prepared'), onSaved: () => { if (!$('library-refresh').disabled) refreshLibrary(); } });
for (const [id, load] of [['sample-demo', file => sampler.loadSample(file)], ['phrase-demo', file => session.loadSample(file)]]) {
  $(id).onclick = async () => {
    const status = $(id === 'sample-demo' ? 'sampler-status' : 'phrase-status');
    if (access.mode === 'basic' || !rights.checked || !$(id === 'sample-demo' ? 'sample-consent' : 'phrase-consent').checked) {
      status.textContent = 'Confirm music and sample or phrase permission first. Use Pro demo to try these controls.'; return;
    }
    $(id).disabled = true;
    try {
      const track = practiceTracks.find(t => !t.partner);
      if (!track) throw Error('Wait for the practice music list to load.');
      const offline = new OfflineAudioContext(1, 4 * 48000, 48000);
      const source = offline.createBufferSource();
      source.buffer = await offline.decodeAudioData(await (await practiceFile(track)).arrayBuffer());
      source.connect(offline.destination); source.start();
      const samples = (await offline.startRendering()).getChannelData(0);
      const clip = new File([encodeWav(samples, 0, 4)], 'Practice sound.wav', {type:'audio/wav'});
      await load(clip);
    } catch (error) { status.textContent = error.message; }
    finally { $(id).disabled = false; access.refresh(); }
  };
}
$('crossfade').oninput = $('master').oninput = levels;
$('crossfade-curve').onchange = levels;
$('pause-all').onclick = () => { decks.forEach(pause); sampler.stop(); clearDeckEchoes(); $('mixer-status').textContent = 'All decks and samples paused.'; };
window.addEventListener('pagehide', event => {
  decks.forEach(pause); clearDeckEchoes();
  if (!event.persisted) { decks.forEach(unload); context?.close().catch(() => {}); }
});
attachStudioRecovery({decks,rights,loadTrack,prepareFrames,levels,deckEffects,controls,session,keyboard});
const cueRouting=attachCueRouting({graph:audioGraph,context:()=>context,mixer:()=>mixer,rights,paused:()=>decks.every(d=>d.audio.paused&&!d.sessionPlaying&&!d.starting)});
const academySamples = new Float32Array(2048);
function academySnapshot() {
  const measure=node=>{if(!node||context?.state!=='running')return {peak:0,rms:0};node.getFloatTimeDomainData(academySamples);
    let peak=0,sum=0;for(const v of academySamples){peak=Math.max(peak,Math.abs(v));sum+=v*v;}return {peak,rms:Math.sqrt(sum/academySamples.length)};};
  const output=measure(mixer?.meter),a=measure(mixer?.strips[0].scope),b=measure(mixer?.strips[1].scope);
  return {t:context?.currentTime??0,a:decks[0].audio.paused?0:a.rms,b:decks[1].audio.paused?0:b.rms,
    playingA:decks[0].audio.paused?0:1,playingB:decks[1].audio.paused?0:1,x:Number($('crossfade').value),master:Number($('master').value),...output,
    rateA:decks[0].audio.playbackRate,rateB:decks[1].audio.playbackRate,levelA:Number($('level-a').value),levelB:Number($('level-b').value),rack:measure(mixer?.rackScope).rms,rackLevel:Number($('rack-level').value),positionA:decks[0].audio.currentTime,positionB:decks[1].audio.currentTime,
    bassA:Number($('eq-a-0').value),bassB:Number($('eq-b-0').value),toneA:Number($('tone-a').value),echoA:Number($('echo-a').value),
    loopA:decks[0].audio.region?1:0,loopB:decks[1].audio.region?1:0,
    ...Object.fromEntries(decks.map(d=>['loopBeats'+d.id.toUpperCase(),d.audio.region?(d.audio.region[1]-d.audio.region[0])*Number($(`bpm-${d.id}`).value)/60:0])),buffered:decks.every(d=>!!d.audio.buffer)?1:0};
}
const bridge=deckBridge(academySnapshot);
const setRecording=attachSetRecording({graph:audioGraph,context:()=>context,mixer:()=>mixer,emit:event=>bridge.publish({...event,...(event.action==='recording.sample'?{sample:{...academySnapshot(),peak:event.peak,rms:event.rms}}:{})})});
for(const id of ['set-record-start','set-record-stop'])bridge.bind($(id),'onclick','recording.control');
for(const id of ['crossfade','master','level-a','level-b','rate-a','rate-b','seek-a','seek-b','rack-level',...['a','b'].flatMap(d=>['tone','echo','delay',...['eq'].flatMap(p=>[`${p}-${d}-0`,`${p}-${d}-1`,`${p}-${d}-2`])].map(p=>p.startsWith('eq-')?p:`${p}-${d}`))])bridge.bind($(id),'oninput',id==='crossfade'?'crossfader.set':'parameter.set');
for(const id of ['pause-all',...['a','b'].flatMap(d=>['play','cue','set-cue','loop','fx-reset','match','tap','rate-reset','prepare-frames','beat-loop','beat-roll','loop-exit','jump-back','jump-forward','align',...Array.from({length:4},(_,i)=>`hot-${d}-${i}`)].map(p=>p.startsWith('hot-')?p:`${p}-${d}`))])bridge.bind($(id),'onclick','deck.control');
if((location.pathname.startsWith('/academy/')||location.pathname.startsWith('/academy-offline/'))||new URLSearchParams(location.search).has('academy'))import('./academy-coach.js').then(({attachAcademy})=>attachAcademy({bridge,
  async load(tracks){if(!rights.checked)throw new Error('Confirm the music permission checkbox first.');
   decks.forEach(pause);
   for(let i=0;i<2;i++){const track=tracks[i],response=await fetch(track.url);if(!response.ok)throw new Error('Practice music unavailable. Reconnect to prepare it.');
    const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(sha!==track.sha256)throw new Error('Practice track checksum mismatch.');
    const file=new File([bytes],track.title+'.mp3',{type:'audio/mpeg'});
    await loadTrack(decks[i],()=>file);if(decks[i].file!==file)throw new Error('Practice track could not load.');
    const buffer=await context.decodeAudioData(bytes.slice(0));
    if(buffer.duration>180||buffer.numberOfChannels>2)throw new Error('Course audio exceeds the playback limit.');
    if(!rights.checked||decks[i].file!==file)throw Error('Practice load interrupted.');
    decks[i].audio.useBuffer(buffer);controls(decks[i]);
    decks[i].academyAsset=track.id;$(`bpm-${decks[i].id}`).value=track.bpm;
   }
  },assets:()=>decks.map(d=>d.academyAsset)})).catch(()=>{$('mixer-status').textContent='Academy could not load. Your local DJ controls remain available.';});
// Refresh readouts from the shared audio clock, including buffer-backed course decks.
setInterval(() => {
  decks.forEach(controls);
  bridge.sample();
  session.refresh();
  access.refresh();
  if (!mixer || context.state !== 'running') { $('output-meter').value = 0; $('peak').textContent = 'Silent'; return; }
  let peak = 0;
  for (const node of mixer.stereoMeters) {
    node.getFloatTimeDomainData(meterData);
    for (const value of meterData) peak = Math.max(peak, Math.abs(value));
  }
  $('output-meter').value = Math.min(1, peak);
  $('peak').textContent = peak > .00001 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : 'Silent';
}, 100);
