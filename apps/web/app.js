import './offline.js';
import './install.js';
import { compositionKey } from './novelty.js';
import { decodeAudio, encodeWav, RATE } from './audio.js';
import { loadSessions, saveSession, deleteSession, deleteAllSessions, verifySession, MAX_SESSIONS } from './library.js';

const $ = id => document.getElementById(id);
const names = { hiphop: 'Hip-hop', reggae: 'Reggae', experimental: 'Experimental', club: 'Club', funk: 'Funk', call_response: 'Call & response', hybrid: 'Surprise hybrid' };
let samples, start = 0, end = 0, previewURL, state = 'idle', worker, recorder, stream, recordTimer;
let operation = 0, recordedAt = 0, sessions = [], urls = [], deleting;
const say = message => { $('status').textContent = message; };
const fail = error => { $('error').textContent = error.message || String(error); $('error').hidden = false; };
const clearError = () => { $('error').hidden = true; $('error').textContent = ''; };

function update() {
  const idle = state === 'idle';
  $('record').disabled = !($('consent').checked && (idle || state === 'recording'));
  $('record').textContent = state === 'recording' ? '■ Stop recording' : '● Record';
  $('import').disabled = !idle || !$('consent').checked;
  $('generate').disabled = !idle || !samples || !$('consent').checked;
  $('styles').disabled = !idle;
  $('trim-start').disabled = $('trim-end').disabled = $('clear-source').disabled = !idle;
  $('cancel').hidden = state !== 'generating';
  $('delete-all').disabled = !idle;
  $('generate').textContent = state === 'generating' ? 'Making your music…' : 'Make music';
  $('studio').setAttribute('aria-busy', String(state === 'generating' || state === 'loading'));
}

function pauseAll(except) {
  document.querySelectorAll('audio').forEach(audio => { if (audio !== except) audio.pause(); });
}
function detachAudio(audio) {
  audio.pause(); audio.removeAttribute('src'); audio.load();
}
document.addEventListener('play', event => { if (event.target instanceof HTMLAudioElement) pauseAll(event.target); }, true);

function drawWaveform() {
  const canvas = $('waveform');
  const width = Math.max(1, canvas.clientWidth), height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const context = canvas.getContext('2d'); context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  const bars = Math.floor(width / 5);
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    if (samples) {
      const a = Math.floor(i / bars * samples.length), b = Math.floor((i + 1) / bars * samples.length);
      for (let j = a; j < b; j++) peak = Math.max(peak, Math.abs(samples[j]));
    }
    const seconds = samples ? i / bars * samples.length / RATE : 0;
    context.fillStyle = samples && seconds >= start && seconds <= end ? '#c3ef69' : '#667062';
    const size = samples ? Math.max(2, peak * (height - 8)) : 2;
    context.fillRect(i * 5, (height - size) / 2, 1.5, size);
  }
}
new ResizeObserver(drawWaveform).observe($('waveform'));

function selection() {
  $('start-value').textContent = `${start.toFixed(2)} s`;
  $('end-value').textContent = `${end.toFixed(2)} s`;
  $('trim-start').value = start; $('trim-end').value = end;
  if (previewURL) { detachAudio($('preview')); URL.revokeObjectURL(previewURL); }
  previewURL = URL.createObjectURL(new Blob([encodeWav(samples, start, end)], { type: 'audio/wav' }));
  $('preview').src = previewURL;
  drawWaveform();
}
$('trim-start').addEventListener('input', () => {
  start = +$('trim-start').value;
  end = Math.min(samples.length / RATE, Math.max(start + 2, Math.min(end, start + 5)));
  selection();
});
$('trim-end').addEventListener('input', () => {
  end = +$('trim-end').value;
  start = Math.max(0, Math.min(end - 2, Math.max(start, end - 5)));
  selection();
});

async function useRecording(blob, recorded = false) {
  const token = ++operation;
  state = 'loading'; clearError(); pauseAll(); say('Opening your recording…'); update();
  $('capture-status').textContent = '';
  try {
    const decoded = await decodeAudio(blob, recorded);
    if (token !== operation || !$('consent').checked) return;
    samples = decoded; start = 0; end = Math.min(5, samples.length / RATE);
    $('trim-start').max = samples.length / RATE - 2;
    $('trim-end').max = samples.length / RATE;
    $('trim').hidden = false;
    $('source-description').textContent = `${(samples.length / RATE).toFixed(2)} seconds · choose 2–5 seconds`;
    selection(); say('Choose your direction. Make something new.');
  } catch (error) { if (token === operation) { fail(error); say('Try another recording.'); } }
  finally { if (token === operation) { state = 'idle'; update(); } }
}

$('import').onclick = () => $('file').click();
$('file').onchange = () => {
  const file = $('file').files[0]; $('file').value = '';
  if (file && state === 'idle' && $('consent').checked) useRecording(file);
};
$('clear-source').onclick = () => {
  pauseAll(); samples = undefined;
  detachAudio($('preview'));
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = undefined;
  $('trim').hidden = true; $('source-description').textContent = '2–5 seconds · stays on this device';
  say('Add your recording to begin.'); drawWaveform(); update();
};

function stopCapture(discard = false) {
  if (discard) operation++;
  clearInterval(recordTimer);
  if (recorder?.state === 'recording') recorder.stop();
  stream?.getTracks().forEach(track => track.stop()); stream = undefined;
  if (discard) { state = 'idle'; $('capture-status').textContent = 'Recording stopped and discarded.'; update(); }
}

$('record').onclick = async () => {
  if (state === 'recording') { stopCapture(); return; }
  if (state !== 'idle' || !$('consent').checked) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    fail(new Error('Recording is unavailable here. Use a supported browser on HTTPS or localhost, or import audio.')); return;
  }
  const token = ++operation;
  clearError(); pauseAll(); state = 'permission'; update();
  $('capture-status').textContent = 'Allow microphone access to record.';
  try {
    const capture = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (token !== operation || !$('consent').checked || document.hidden) { capture.getTracks().forEach(track => track.stop()); return; }
    stream = capture;
    const chunks = [];
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(value => MediaRecorder.isTypeSupported(value));
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const activeRecorder = recorder;
    activeRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    activeRecorder.onstop = () => {
      capture.getTracks().forEach(track => track.stop());
      if (token !== operation) return;
      clearInterval(recordTimer);
      $('capture-status').textContent = '';
      if ((performance.now() - recordedAt) < 2000) {
        state = 'idle'; fail(new Error('Record at least 2 seconds. Try a short phrase.')); update(); return;
      }
      useRecording(new Blob(chunks, { type: activeRecorder.mimeType }), true);
    };
    activeRecorder.onerror = () => {
      if (token === operation) { stopCapture(true); fail(new Error('Microphone recording failed. Try importing audio.')); }
    };
    recordedAt = performance.now(); state = 'recording'; activeRecorder.start(); update();
    $('capture-status').textContent = 'Recording… 0.0 s / 5 s';
    recordTimer = setInterval(() => {
      const elapsed = (performance.now() - recordedAt) / 1000;
      $('capture-status').textContent = `Recording… ${elapsed.toFixed(1)} s / 5 s`;
      if (elapsed >= 4.8) stopCapture();
    }, 100);
  } catch (error) {
    if (token === operation) {
      stopCapture(true);
      fail(new Error(error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser, or import audio.' : 'No microphone is available. Connect one or import audio.'));
    }
  }
};

function cancelRender(message = 'Cancelled. Your previous mixes are safe.') {
  operation++; worker?.terminate(); worker = undefined; state = 'idle'; say(message); update();
}
$('cancel').onclick = () => cancelRender();
$('consent').onchange = () => {
  if (!$('consent').checked) {
    if (state === 'generating') cancelRender();
    else if (['permission', 'recording'].includes(state)) stopCapture(true);
    else if (state === 'loading') { operation++; state = 'idle'; }
  }
  update();
};

$('generate').onclick = async () => {
  if (state !== 'idle' || !samples || !$('consent').checked) return;
  if (sessions.length >= MAX_SESSIONS) {
    fail(new Error('Your library is full. Download and delete a session before making another.')); return;
  }
  let wav;
  try { wav = encodeWav(samples, start, end); } catch (error) { fail(error); return; }
  clearError(); pauseAll(); state = 'generating'; update(); say('Loading the music engine…');
  const token = ++operation, began = performance.now();
  const style = document.querySelector('input[name=style]:checked').value;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  let recent;
  try {
    recent = await Promise.all(sessions.flatMap(session => session.files.filter(file => file.name.endsWith('.score.json')))
      .map(async file => compositionKey(JSON.parse(await file.blob.text()))));
  } catch (error) {
    if (token === operation) { state = 'idle'; fail(new Error('Could not read your recent mixes. Reload the page and try again.')); update(); }
    return;
  }
  if (token !== operation) return;
  const activeWorker = new Worker('./engine-worker.js', { type: 'module' });
  worker = activeWorker;
  const timeout = setTimeout(() => {
    if (token === operation && state === 'generating') { cancelRender('Generation stopped after two minutes. Try again.'); fail(new Error('This device took too long to finish.')); }
  }, 120000);
  activeWorker.onerror = () => {
    clearTimeout(timeout);
    if (token === operation) { cancelRender('Could not load the music engine.'); fail(new Error('Reload the page and try again. Your saved mixes are safe.')); }
  };
  activeWorker.onmessage = async ({ data }) => {
    if (token !== operation) return;
    if (data.type === 'rendering') { say(style === 'three' ? 'Making three different takes…' : `Building your ${names[style].toLowerCase()} mix…`); return; }
    clearTimeout(timeout);
    activeWorker.terminate(); worker = undefined;
    if (data.type === 'error') { state = 'idle'; fail(new Error(data.message)); say('Try a different selection or recording.'); update(); return; }
    if (data.type !== 'complete') return;
    // Completion is the cancellation boundary: commit the entire set atomically.
    state = 'saving'; update();
    const session = { id: crypto.randomUUID(), created: Date.now(), style, seed: data.seed,
      seconds: (performance.now() - began) / 1000,
      files: data.files.map(file => ({ name: file.name, sha256: file.sha256,
        blob: new Blob([file.bytes], { type: file.name.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream' }) })) };
    try {
      if (!await verifySession(session)) throw new Error('The completed mix did not pass its integrity check.');
      try { await saveSession(session); }
      catch (error) { session.unsaved = true; fail(error); }
      sessions.unshift(session); renderLibrary();
      say(`Ready in ${session.seconds.toFixed(1)} seconds. Play a mix below, or make music again.`);
    } catch (error) { fail(error); }
    finally { state = 'idle'; update(); }
  };
  activeWorker.postMessage({ wav, style, seed, recent, consent: true }, [wav]);
};

function element(tag, text, className) {
  const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
}
function renderLibrary() {
  pauseAll(); $('library').querySelectorAll('audio').forEach(detachAudio);
  urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
  $('library').replaceChildren();
  $('library-count').textContent = sessions.length ? `${sessions.filter(s => !s.unsaved).length} / ${MAX_SESSIONS} sessions` : '';
  if (!sessions.length) {
    const empty = element('div', '', 'empty');
    empty.append(element('p', 'Your next favourite starts here.'), element('span', 'Finished mixes live in this browser. Download the ones you love.', 'muted'));
    $('library').append(empty); return;
  }
  for (const session of sessions) {
    const section = element('article', '', 'session');
    const heading = element('div', '', 'session-heading'), details = element('div');
    details.append(element('h3', session.style === 'call_response' ? 'A conversation in sound' : session.style === 'hybrid' ? 'Around the next corner' : session.style === 'funk' ? 'Find your pocket' : session.style === 'club' ? 'A little after dark' : 'Three sides of your sound'));
    details.append(element('p', `${new Date(session.created).toLocaleString()} · ${session.unsaved ? 'Not saved — download to keep' : 'Saved in this browser'}`, 'muted'));
    const remove = element('button', 'Delete', 'text-button'); remove.setAttribute('aria-label', 'Delete session');
    remove.onclick = () => { deleting = session; $('delete-title').textContent = 'Delete this session?'; $('delete-confirm').textContent = 'Delete session'; $('delete-dialog').showModal(); $('delete-cancel').focus(); };
    heading.append(details, remove); section.append(heading);
    for (const file of session.files.filter(file => file.name.endsWith('.wav'))) {
      const style = file.name.split('.')[0], row = element('div', '', 'track');
      const url = URL.createObjectURL(file.blob); urls.push(url);
      const audio = element('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = url; audio.setAttribute('aria-label', `Play ${names[style]} mix`);
      const download = element('a', 'Download WAV', 'download'); download.href = url; download.download = `djayvo-${style}-${session.seed}.wav`;
      download.setAttribute('aria-label', `Download ${names[style]} WAV`);
      row.append(element('strong', names[style]), audio, download); section.append(row);
    }
    $('library').append(section);
  }
}
$('delete-cancel').onclick = () => $('delete-dialog').close();
$('delete-confirm').onclick = async () => {
  if (!deleting) return;
  $('delete-confirm').disabled = true;
  try {
    if (deleting === 'all') {
      await deleteAllSessions(); sessions = []; $('storage-note').textContent = '';
    } else {
      await deleteSession(deleting.id); sessions = sessions.filter(session => session.id !== deleting.id);
    }
    renderLibrary(); $('delete-dialog').close(); deleting = undefined;
  } catch (error) { fail(error); }
  finally { $('delete-confirm').disabled = false; }
};
$('privacy-open').onclick = () => $('privacy').showModal();
$('privacy-close').onclick = () => $('privacy').close();
$('delete-all').onclick = () => {
  deleting = 'all'; $('privacy').close(); $('delete-title').textContent = 'Delete all saved mixes?';
  $('delete-confirm').textContent = 'Delete all mixes'; $('delete-dialog').showModal(); $('delete-cancel').focus();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseAll();
    if (['recording', 'permission'].includes(state)) stopCapture(true);
    if (state === 'generating') cancelRender('Generation paused when you left. Press Make music to start again.');
  }
});
window.addEventListener('pagehide', () => { stopCapture(true); worker?.terminate(); pauseAll(); });

try {
  const stored = await loadSessions();
  let invalid = 0;
  for (const session of stored) { if (await verifySession(session)) sessions.push(session); else invalid++; }
  sessions.sort((a, b) => b.created - a.created); renderLibrary();
  if (invalid) $('storage-note').textContent = `${invalid} incomplete or damaged session(s) were withheld. No stored data was deleted.`;
} catch (error) { $('storage-note').textContent = error.message; }
update();
