import { decodeAudio, encodeWav, resumeAudio } from './audio.js';
import { SessionTransport } from './session-transport.js';
import { setMixerGain, validatePreparedTrack, updateToneEcho, clearEcho, beatEchoDelay } from './mixer.js';
import { compositionKey } from './novelty.js';
import { saveSession, verifySession } from './library.js';

const $ = id => document.getElementById(id);
const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export function attachPerformance({ deck, graph, context, mixer, pause, controls, rights, onSaved, onPhraseChanged = () => {}, onSourcesChanged = () => {} }) {
  let prepared, transport, samples, performanceBuffer, download, busy = '', starting = '', revision = 0, startVersion = 0;
  let savedPerformance, saving = false, saved = false;
  let sourceOrigin, phraseBlob;
  let worker, timer, recorder, stream, recordingAt, generationContext, recent = [], wasA = false, wasC = false;
  const error = failure => { $('performance-error').textContent = failure.message || String(failure); };
  const say = text => { $('performance-status').textContent = text; };
  const confirmed = () => rights.checked && $('context-confirmed').checked && !!prepared;
  const permitted = () => $('phrase-consent').checked;
  const canRecord = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const currentContext = () => ({ tempo: Math.round(Number($('session-bpm').value) * 1000), tonic: Number($('session-key').value), mode: $('session-mode').value });
  notes.forEach((name, i) => { const option = document.createElement('option'); option.value = 60 + i; option.textContent = name; $('session-key').append(option); });
  $('session-key').value = '69';
  function clearCEcho() { if (mixer()) clearEcho(context(), mixer().performanceFX); }
  function effects(reset = false) {
    if (reset) {
      $('tone-c').value = '100'; $('echo-c').value = '0'; $('delay-c').value = '300'; $('echo-grid-c').value = 'manual';
      clearCEcho();
    }
    const division = $('echo-grid-c').value;
    const tone = Number($('tone-c').value), echo = Number($('echo-c').value);
    const spacing = division === 'manual' ? Number($('delay-c').value) : beatEchoDelay(generationContext?.tempo, division);
    $('tone-c-value').textContent = tone === 100 ? 'Open' : `${Math.round(200 * 100 ** (tone / 100))} Hz`;
    $('echo-c-value').textContent = echo ? `${Math.round(echo * 100)}%` : 'Off';
    $('delay-c-value').textContent = `${$('delay-c').value} ms`;
    $('echo-grid-c-value').textContent = division === 'manual' ? '' : `${Number(spacing.toFixed(2))} ms`;
    if (mixer()) updateToneEcho(context(), mixer().performanceFX, tone, echo, spacing);
  }
  function refresh() {
    const playing = !!transport?.a, activeC = !!transport?.c;
    if (wasC && !activeC) clearCEcho();
    $('prepare-a').disabled = !rights.checked || !deck.file || !deck.audio.paused || !!deck.loading || !!busy || !!prepared || deck.starting;
    $('release-a').disabled = !prepared && busy !== 'preparing';
    $('session-play').disabled = !confirmed() || playing || !!busy || !!starting;
    $('session-stop').disabled = !playing && starting !== 'a';
    $('context-confirmed').disabled = !prepared || playing || !!busy || !!starting;
    for (const id of ['session-bpm', 'session-key', 'session-mode', 'session-downbeat']) $(id).disabled = playing || !!busy || !!starting;
    $('phrase-record').disabled = !canRecord || !permitted() || !!starting || (!!busy && busy !== 'recording');
    $('phrase-record').textContent = busy === 'recording' ? 'Stop recording' : canRecord ? 'Record phrase' : 'Recording unavailable';
    $('phrase-file').disabled = !permitted() || !!busy || !!starting;
    $('phrase-delete').disabled = !samples && !busy && !performanceBuffer;
    $('phrase-generate').disabled = !confirmed() || !permitted() || !samples || !!busy || !!starting || activeC;
    $('phrase-cancel').disabled = !['generating', 'loading', 'permission'].includes(busy);
    $('c-arm').disabled = !playing || !performanceBuffer || !confirmed() || !permitted() || !!busy || !!starting || activeC;
    $('performance-save').disabled = !savedPerformance || !permitted() || !rights.checked || !!busy || saving || saved;
    $('performance-save').textContent = saving ? 'Saving…' : saved ? 'Saved on this device' : 'Save C on this device';
    $('c-stop').disabled = !activeC && starting !== 'c';
    $('c-preview').disabled = playing || !performanceBuffer || !permitted() || !confirmed() || !!busy || !!starting || activeC;
    for (const id of ['tone-c', 'echo-c', 'delay-c', 'echo-grid-c', 'fx-reset-c']) $(id).disabled = !performanceBuffer || !permitted() || !confirmed();
    $('delay-c').disabled ||= $('echo-grid-c').value !== 'manual';
    deck.sessionTime = transport?.a ? Math.max(0, context().currentTime - transport.a.frame / context().sampleRate) : 0;
    deck.sessionPlaying = playing;
    if (activeC) {
      const seconds = (transport.c.frame / context().sampleRate - context().currentTime);
      say(!playing ? 'Previewing C through the performance channel.' : seconds > 0 ? `C armed · enters in ${seconds.toFixed(1)} s. Stop C cancels entry.` : 'A + C playing on the shared audio clock.');
    }
    if (wasA && !playing) say(busy === 'generating' ? 'A has ended. C is still preparing.' : 'A stopped. Start prepared A to play again.');
    else if (wasC && !activeC) say(playing ? 'C stopped. A continues.' : 'C stopped.');
    if (starting) say(starting === 'a' ? 'Starting prepared A… Stop A + C cancels this request.' : 'Starting C preview… Stop C cancels this request.');
    wasA = playing; wasC = activeC;
    controls(deck);
  }
  function clearPerformance() {
    savedPerformance = undefined; saved = false; onSourcesChanged();
    $('performance-save-status').textContent = '';
    transport?.stopC(); performanceBuffer = undefined; generationContext = undefined;
    effects(true);
    if (download) URL.revokeObjectURL(download);
    download = undefined; $('performance-download').hidden = true; $('performance-download').removeAttribute('href');
  }
  function cancel() {
    if (starting) say('Playback request cancelled.');
    if (['permission', 'recording'].includes(busy)) $('phrase-status').textContent = samples ? 'Recording cancelled. Previous phrase kept.' : 'Recording cancelled. No phrase loaded.';
    revision++; startVersion++; starting = ''; worker?.terminate(); worker = undefined; clearTimeout(timer); clearInterval(timer);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach(track => track.stop()); stream = undefined; recorder = undefined;
    busy = ''; deck.preparing = false; refresh();
  }
  function reset() {
    cancel(); transport?.stop(); prepared = undefined; transport = undefined;
    deck.prepared = false; deck.sessionPlaying = false; $('context-confirmed').checked = false;
    clearPerformance(); say('Load and prepare Deck A to begin.'); refresh();
  }
  function stop() {
    if (starting) say('Playback request cancelled.');
    startVersion++; starting = ''; transport?.stop(); clearCEcho(); refresh();
  }
  function deletePhrase() {
    cancel(); samples = undefined; sourceOrigin = undefined; phraseBlob = undefined; onPhraseChanged();
    recent = []; clearPerformance(); $('phrase-status').textContent = 'Phrase and C deleted from this tab.'; refresh();
  }
  $('prepare-a').onclick = async () => {
    if (busy || !deck.file || !rights.checked || !deck.audio.paused || deck.starting) return;
    const file = deck.file;
    if (file.size > 32 * 1024 * 1024 || deck.duration > 300) { error(new Error('Prepared sessions accept tracks up to 32 MB / 5 minutes. Manual decks still accept larger tracks.')); return; }
    pause(deck); busy = 'preparing'; deck.preparing = true;
    const token = ++revision; refresh(); $('performance-error').textContent = ''; say('Preparing A and analyzing its first 30 seconds…');
    try {
      graph();
      const buffer = await context().decodeAudioData(await file.arrayBuffer());
      if (token !== revision) return;
      validatePreparedTrack(buffer);
      const response = await fetch('./engine/jamloom_live.wasm', { credentials: 'omit' });
      if (!response.ok) throw new Error('Prepare the studio online once to load its engine.');
      const engine = (await WebAssembly.instantiate(await response.arrayBuffer(), {})).instance.exports;
      engine._initialize();
      if (token !== revision) return;
      const offline = new OfflineAudioContext(1, Math.floor(Math.min(30, buffer.duration) * 8000), 8000);
      const source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start();
      const mono = (await offline.startRendering()).getChannelData(0).slice();
      if (token !== revision) return;
      const analysis = await new Promise((resolve, reject) => {
        worker = new Worker('./session-analysis-worker.js', { type: 'module' });
        timer = setTimeout(() => { worker?.terminate(); reject(new Error('Analysis timed out. Try a shorter track.')); }, 20000);
        worker.onerror = () => reject(new Error('Track analysis failed.'));
        worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.result);
        worker.postMessage({ samples: mono, rate: 8000 }, [mono.buffer]);
      });
      if (token !== revision || !rights.checked || deck.file !== file) return;
      prepared = buffer; deck.prepared = true;
      transport = new SessionTransport(context(), engine.jamloom_next_bar, refresh);
      const key = analysis.keys[0];
      $('context-analysis').textContent = `First 30 s estimate: ${analysis.tempo.bpm} BPM (pulse correlation ${analysis.tempo.confidence.toFixed(2)}); strongest triad ${notes[key.tonic]} ${key.mode}. Tempo may be half/double; triads do not establish a key. Confirm the tonic, major/minor mode and downbeat yourself. A will play at original speed.`;
      if (analysis.tempo.confidence > .3) $('session-bpm').value = analysis.tempo.bpm;
      if (key.score > 0) { $('session-key').value = 60 + key.tonic; $('session-mode').value = key.mode; }
      $('session-downbeat').max = buffer.duration; $('context-confirmed').checked = false;
      say('A prepared. Check its tempo, key and first downbeat, then confirm.');
    } catch (failure) { if (token === revision) error(failure); }
    finally {
      if (token === revision) { worker?.terminate(); worker = undefined; clearTimeout(timer); busy = ''; deck.preparing = false; refresh(); }
    }
  };
  $('release-a').onclick = reset;
  $('session-play').onclick = async () => {
    if (!confirmed() || busy || starting || transport?.a) return;
    const token = revision, start = ++startVersion;
    starting = 'a'; $('performance-error').textContent = ''; refresh();
    try {
      await resumeAudio(context());
      if (token !== revision || start !== startVersion || !confirmed()) return;
      if (context().state !== 'running') throw new Error('Audio is interrupted. Try Start prepared A again.');
      starting = '';
      transport.startA(prepared, mixer().strips[0].input, currentContext().tempo, Number($('session-downbeat').value));
      say('Prepared A playing. Capture a phrase or bring your ready performance in.'); refresh();
    } catch (failure) { if (token === revision && start === startVersion) { error(failure); say('A could not start. Ready to try again.'); } }
    finally { if (start === startVersion) { starting = ''; refresh(); } }
  };
  $('session-stop').onclick = () => { stop(); say('A + C stopped. Ready to start A again from the beginning.'); };
  for (const id of ['session-bpm', 'session-key', 'session-mode', 'session-downbeat', 'context-confirmed']) $(id).addEventListener('change', () => {
    cancel(); stop(); clearPerformance(); if (id !== 'context-confirmed') $('context-confirmed').checked = false;
    refresh();
  });
  async function loadPhrase(blob, recorded = false) {
    $('performance-error').textContent = '';
    busy = 'loading'; const token = ++revision; refresh();
    try {
      const decoded = await decodeAudio(blob, recorded);
      if (token !== revision || !permitted()) return;
      if (decoded.length > 5 * 48000) throw new Error('Import a 2–5 second phrase. Trim longer recordings in Voice studio first.');
      const normalized = new Blob([encodeWav(decoded)], { type: 'audio/wav' });
      clearPerformance(); samples = decoded; phraseBlob = normalized; sourceOrigin = recorded ? 'microphone' : 'imported_file'; onPhraseChanged();
      $('phrase-status').textContent = `${(samples.length / 48000).toFixed(2)} s phrase ready · held only in this tab.`;
    } catch (failure) { if (token === revision) error(failure); }
    finally { if (token === revision) { busy = ''; refresh(); } }
  }
  $('phrase-file').onchange = event => {
    const file = event.target.files[0]; event.target.value = '';
    if (file && permitted() && !busy && !starting) loadPhrase(file);
  };
  $('phrase-record').onclick = async () => {
    if (busy === 'recording') { clearInterval(timer); recorder.stop(); stream?.getTracks().forEach(track => track.stop()); return; }
    if (!permitted() || busy || starting) return;
    $('performance-error').textContent = '';
    const token = ++revision; busy = 'permission'; refresh();
    $('phrase-status').textContent = 'Waiting for microphone permission. Use headphones to prevent recapturing Deck A.';
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microphone capture is unavailable; import a phrase instead.');
      const capture = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (token !== revision || !permitted() || document.hidden) { capture.getTracks().forEach(track => track.stop()); return; }
      stream = capture;
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(value => MediaRecorder.isTypeSupported(value));
      const active = recorder = new MediaRecorder(capture, type ? { mimeType: type } : undefined), chunks = [];
      active.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      active.onstop = () => {
        capture.getTracks().forEach(track => track.stop());
        if (token !== revision) return;
        clearInterval(timer); stream = recorder = undefined;
        if (performance.now() - recordingAt < 2000) { busy = ''; error(new Error('Record at least 2 seconds.')); refresh(); return; }
        loadPhrase(new Blob(chunks, { type: active.mimeType }), true);
      };
      active.onerror = () => { if (token === revision) { cancel(); error(new Error('Recording failed. Try importing a phrase.')); } };
      recordingAt = performance.now(); busy = 'recording'; active.start(); refresh();
      timer = setInterval(() => {
        const elapsed = (performance.now() - recordingAt) / 1000;
        $('phrase-status').textContent = `Recording · ${elapsed.toFixed(1)} / 5 s`;
        if (elapsed >= 4.8) { clearInterval(timer); active.stop(); capture.getTracks().forEach(track => track.stop()); }
      }, 100);
    } catch (failure) { if (token === revision) { cancel(); error(new Error(`Microphone unavailable: ${failure.message}`)); } }
  };
  $('performance-save').onclick = async () => {
    if (!savedPerformance || saving || saved || busy || !permitted() || !rights.checked) return;
    const performance = savedPerformance;
    saving = true; refresh();
    $('performance-save-status').textContent = 'Saving locally. Keep this tab open until it finishes.';
    try {
      if (!await verifySession(performance)) throw new Error('Performance integrity check failed.');
      if (performance !== savedPerformance || !permitted() || !rights.checked) return;
      // An explicit save persists independently of unloading a deck or deleting its phrase.
      await saveSession(performance);
      if (performance === savedPerformance) saved = true;
      $('performance-save-status').textContent = 'Saved in this browser. Manage or delete it in Voice studio.';
      onSaved?.();
    } catch (failure) {
      $('performance-save-status').textContent = failure.message;
    } finally { saving = false; refresh(); }
  };
  $('phrase-generate').onclick = () => {
    if (!confirmed() || !permitted() || !samples || busy || starting || transport?.c) return;
    const requested = currentContext(), token = ++revision, began = performance.now();
    let wav;
    try { wav = encodeWav(samples); } catch (failure) { error(failure); return; }
    busy = 'generating'; refresh(); $('performance-error').textContent = ''; say('Preparing a new phrase-response performance. A keeps playing…');
    worker = new Worker('./engine-worker.js', { type: 'module' });
    const failed = message => { if (token === revision) { cancel(); error(new Error(message)); say('Preparation failed; A is unaffected. Your last ready performance is kept.'); } };
    timer = setTimeout(() => failed('Preparation exceeded two minutes.'), 120000);
    worker.onerror = () => failed('The local director could not load. Prepare the offline app and try again.');
    worker.onmessage = async ({ data }) => {
      if (token !== revision || data.type === 'rendering') return;
      if (data.type !== 'complete') { failed(data.message || 'Preparation failed.'); return; }
      clearTimeout(timer); worker.terminate(); worker = undefined;
      try {
        for (const file of data.files) {
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', file.bytes)), n => n.toString(16).padStart(2, '0')).join('');
          if (hash !== file.sha256) throw new Error('Performance integrity check failed.');
        }
        const score = JSON.parse(new TextDecoder().decode(data.files.find(f => f.name.endsWith('.score.json')).bytes));
        const report = JSON.parse(new TextDecoder().decode(data.files.find(f => f.name.endsWith('.report.json')).bytes));
        if (score.tempo_milli_bpm !== requested.tempo || score.key.tonic_midi !== requested.tonic || score.key.mode !== requested.mode || report.technical_render !== 'PASS' || report.nonfinite_samples !== 0)
          throw new Error('The performance did not match the confirmed context.');
        const bytes = data.files.find(f => f.name.endsWith('.wav')).bytes;
        const key = await compositionKey(score);
        const buffer = await context().decodeAudioData(bytes.slice().buffer);
        if (token !== revision || !permitted() || !confirmed()) return;
        clearPerformance(); performanceBuffer = buffer; generationContext = requested;
        savedPerformance = {
          id: crypto.randomUUID(), created: Date.now(), style: 'call_response', seed: data.seed,
          seconds: (performance.now() - began) / 1000,
          files: data.files.map(file => ({ name: file.name, sha256: file.sha256,
            blob: new Blob([file.bytes], { type: file.name.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream' }) })),
        };
        onSourcesChanged();
        recent = [...recent.slice(-9), key];
        download = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
        $('performance-download').href = download; $('performance-download').download = `jamloom-session-${data.seed}.wav`; $('performance-download').hidden = false;
        say(`C ready in ${((performance.now() - began) / 1000).toFixed(1)} s · ${buffer.duration.toFixed(1)} s performance. Arm it when A is playing.`);
      } catch (failure) { if (token === revision) error(failure); }
      finally { if (token === revision) { busy = ''; refresh(); } }
    };
    worker.postMessage({ wav, style: 'call_response', seed: crypto.getRandomValues(new Uint32Array(1))[0], recent, consent: true, context: requested }, [wav]);
  };
  $('c-preview').onclick = async () => {
    if (!permitted() || !confirmed() || !performanceBuffer || busy || starting || transport?.a || transport?.c) return;
    const token = revision, start = ++startVersion;
    starting = 'c'; $('performance-error').textContent = ''; refresh();
    try {
      await resumeAudio(context());
      if (token !== revision || start !== startVersion || !permitted() || !confirmed() || !performanceBuffer || transport.a) return;
      if (context().state !== 'running') throw new Error('Audio is interrupted. Try Preview C again.');
      starting = '';
      transport.preview(performanceBuffer, mixer().performanceFX.input);
    } catch (failure) { if (token === revision && start === startVersion) { error(failure); say('C could not start. Ready to try again.'); } }
    finally { if (start === startVersion) { starting = ''; refresh(); } }
  };
  $('c-arm').onclick = () => {
    try {
      if (busy || transport?.c || !permitted() || !confirmed() || !performanceBuffer || JSON.stringify(generationContext) !== JSON.stringify(currentContext())) throw new Error('Prepare C for the current confirmed context first.');
      transport.arm(performanceBuffer, mixer().performanceFX.input); refresh();
    } catch (failure) { error(failure); }
  };
  $('c-stop').onclick = () => {
    if (starting === 'c') { startVersion++; starting = ''; }
    transport?.stopC(); clearCEcho(); say(transport?.a ? 'C stopped. A continues.' : 'C stopped.'); refresh();
  };
  for (const id of ['tone-c', 'echo-c', 'delay-c']) $(id).oninput = () => effects();
  $('echo-grid-c').onchange = () => { effects(); refresh(); };
  $('fx-reset-c').onclick = () => { effects(true); refresh(); };
  $('phrase-cancel').onclick = () => { cancel(); say('Preparation cancelled. A continues.'); };
  $('phrase-delete').onclick = deletePhrase;
  $('phrase-consent').onchange = () => { if (!permitted()) deletePhrase(); refresh(); };
  $('c-level').oninput = () => {
    $('c-level-value').textContent = `${Math.round(Number($('c-level').value) * 100)}%`;
    if (mixer()) setMixerGain(context(), mixer(), 'c', Number($('c-level').value) * Number($('master').value) * .8);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (busy) cancel(); stop(); say('Session stopped when the page was hidden. Start A again when ready.'); } });
  window.addEventListener('pagehide', () => { reset(); deletePhrase(); });
  refresh();
  function phraseSource() {
    if (!permitted() || !samples) return null;
    const captured = samples, c = currentContext();
    return { samples: captured, origin: sourceOrigin, current: () => permitted() && samples === captured,
      context: confirmed() ? { tempo_milli_bpm: c.tempo, tonic_midi: c.tonic, mode: c.mode,
        beats_per_bar: 4, downbeat_seconds: Number($('session-downbeat').value), status: 'user_confirmed' } : null };
  }
  async function recoverySnapshot(){
    if(busy||starting)throw Error('Wait for phrase preparation before saving the set.');
    if(!prepared&&!samples&&!savedPerformance)return null;
    if(!permitted()&&(samples||savedPerformance))throw Error('Phrase permission is required to save this performance.');
    const snapshotRevision=revision;
    const phrase=phraseBlob?await phraseBlob.arrayBuffer():null;
    const hash=phrase?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',phrase)),n=>n.toString(16).padStart(2,'0')).join(''):null;
    if(snapshotRevision!==revision)throw Error('Phrase changed during recovery save. Try again.');
    return {revision:snapshotRevision,prepared:!!prepared,context:currentContext(),confirmed:confirmed(),downbeat:Number($('session-downbeat').value),phrase,phraseSha:hash,
      performance:savedPerformance?{...savedPerformance,files:await Promise.all(savedPerformance.files.map(async f=>({name:f.name,sha256:f.sha256,bytes:await f.blob.arrayBuffer()})))}:null};
  }
  async function restoreRecovery(state){
    if(!state)return;
    if((state.phrase||state.performance)&&!permitted())throw Error('Confirm phrase permission before restoring voices.');
    if(state.prepared){await $('prepare-a').onclick();if(!prepared)throw Error('Prepared A could not be restored.');}
    const token=revision;
    let restored;
    if(state.performance){restored={...state.performance,files:state.performance.files.map(f=>({...f,blob:new Blob([f.bytes],{type:f.name.endsWith('.wav')?'audio/wav':'application/octet-stream'})}))};if(!await verifySession(restored))throw Error('Saved C failed its integrity check.');}
    if(state.phrase){
      const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',state.phrase)),n=>n.toString(16).padStart(2,'0')).join('');
      if(sha!==state.phraseSha)throw Error('Saved phrase failed its integrity check.');
      await loadPhrase(new Blob([state.phrase],{type:'audio/wav'}));if(!samples)throw Error('Saved phrase could not be restored.');
    }else if(revision!==token)throw Error('Performance restore interrupted.');
    const restoreToken=revision;
    let buffer;
    if(restored){const bytes=await restored.files.find(f=>f.name.endsWith('.wav')).blob.arrayBuffer();buffer=await context().decodeAudioData(bytes);validatePreparedTrack(buffer);}
    if(revision!==restoreToken||!rights.checked||((state.phrase||restored)&&!permitted()))throw Error('Performance restore interrupted.');
    $('session-bpm').value=state.context.tempo/1000;$('session-key').value=state.context.tonic;$('session-mode').value=state.context.mode;$('session-downbeat').value=state.downbeat;
    $('context-confirmed').checked=state.confirmed&&!!prepared;
    if(restored){clearPerformance();savedPerformance=restored;performanceBuffer=buffer;generationContext=state.context;download=URL.createObjectURL(restored.files.find(f=>f.name.endsWith('.wav')).blob);$('performance-download').href=download;$('performance-download').download=`jamloom-session-${restored.seed}.wav`;$('performance-download').hidden=false;onSourcesChanged();}
    say('Prepared session restored, stopped. Check the saved musical context before playback.');refresh();
  }
  return { reset, stop, refresh, phraseSource, recoverySnapshot, restoreRecovery, recoveryCurrent:state=>!state||state.revision===revision&&(!(state.phrase||state.performance)||permitted()), mixSources: () => ({
    c: savedPerformance?.files.find(file => file.name.endsWith('.wav'))?.blob, phrase: phraseBlob,
  }) };
}
