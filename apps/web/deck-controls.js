const $ = id => document.getElementById(id);
export function tempoRate(own, other, otherRate) {
  if (![own, other].every(n => Number.isFinite(n) && n >= 40 && n <= 240) || !Number.isFinite(otherRate))
    throw new Error('Enter both track tempos between 40 and 240 BPM first.');
  const rate = other * otherRate / own;
  if (rate < .84 || rate > 1.16) throw new Error('Tempo match exceeds the ±16% pitch range.');
  return rate;
}
export function attachDeck(deck, other, { pause, start, mixer, context }) {
  const { id, audio } = deck, jog = $(`jog-${id}`);
  let cue = 0, hot = [null, null, null, null], taps = [], drag;
  const error = message => { $(`error-${id}`).textContent = message; };
  const seek = position => { if (deck.url && Number.isFinite(position)) audio.currentTime = Math.max(0, Math.min(deck.duration, position)); };
  const rate = value => {
    // shortcut: pitch changes briefly pause audio; use shared-frame transport for continuous pitch.
    // WebKit can deadlock when changing rate during active end-of-track playback.
    const resume = !audio.paused;
    if (resume) pause(deck);
    audio.playbackRate = value; $(`rate-${id}`).value = value;
    $(`rate-value-${id}`).textContent = `${value >= 1 ? '+' : ''}${((value - 1) * 100).toFixed(1)}%`;
    if (resume) start(deck);
  };
  const eq = band => {
    const value = Number($(`eq-${id}-${band}`).value);
    $(`eq-${id}-${band}-value`).textContent = `${value} dB`;
    mixer()?.strips[id === 'a' ? 0 : 1].eq[band].gain.setTargetAtTime(value, context().currentTime, .005);
  };
  const hotLabels = () => hot.forEach((value, index) => {
    const button = $(`hot-${id}-${index}`), label = value === null ? 'EMPTY' : `${value.toFixed(1)} s`;
    button.querySelector('small').textContent = label;
    button.setAttribute('aria-label', `Deck ${id.toUpperCase()} hot cue ${index + 1}, ${label}`);
  });
  deck.resetTransport = () => {
    cue = 0; hot.fill(null); taps = []; drag = null; hotLabels();
    rate(1); deck.loop = false; audio.loop = false; audio.preservesPitch = true;
    $(`keylock-${id}`).checked = true; $(`bpm-${id}`).value = '';
    $(`loop-${id}`).setAttribute('aria-pressed', 'false');
    for (let i = 0; i < 3; i++) { $(`eq-${id}-${i}`).value = 0; eq(i); }
  };
  deck.applyEQ = () => { for (let i = 0; i < 3; i++) eq(i); };
  deck.transportControls = ready => {
    for (const prefix of ['rate', 'rate-reset', 'cue', 'set-cue', 'loop', 'bpm', 'tap', 'match', 'keylock']) $(`${prefix}-${id}`).disabled = !ready;
    $(`keylock-${id}`).disabled ||= !('preservesPitch' in audio);
    for (let i = 0; i < 3; i++) $(`eq-${id}-${i}`).disabled = !ready;
    for (let i = 0; i < 4; i++) $(`hot-${id}-${i}`).disabled = !ready;
    jog.setAttribute('aria-disabled', String(!ready));
    jog.setAttribute('aria-valuemax', String(deck.duration));
    jog.setAttribute('aria-valuenow', String(audio.currentTime || 0));
    jog.setAttribute('aria-valuetext', `${(audio.currentTime || 0).toFixed(1)} seconds`);
  };
  $(`rate-${id}`).oninput = event => rate(Number(event.target.value));
  $(`rate-reset-${id}`).onclick = () => rate(1);
  $(`keylock-${id}`).onchange = event => { audio.preservesPitch = event.target.checked; };
  $(`set-cue-${id}`).onclick = () => { cue = audio.currentTime; $(`cue-${id}`).title = `Return to ${cue.toFixed(1)} seconds`; };
  $(`cue-${id}`).onclick = () => { pause(deck); seek(cue); };
  $(`loop-${id}`).onclick = event => { deck.loop = !deck.loop; event.currentTarget.setAttribute('aria-pressed', String(deck.loop)); };
  // shortcut: ended-event repeat can gap; use shared-frame transport for beat loops.
  // Native WebKit loop playback stalled after rapid rate/loop changes in testing.
  audio.addEventListener('ended', () => {
    if (deck.loop && deck.playRequested && deck.url && !deck.loading) { pause(deck); start(deck); }
  });
  $(`tap-${id}`).onclick = () => {
    const now = performance.now();
    if (taps.length && now - taps.at(-1) > 1500) taps = [];
    taps.push(now); if (taps.length > 8) taps.shift();
    if (taps.length > 1) {
      const bpm = 60000 * (taps.length - 1) / (now - taps[0]);
      if (bpm >= 40 && bpm <= 240) $(`bpm-${id}`).value = bpm.toFixed(1);
    }
  };
  $(`match-${id}`).onclick = () => {
    try { rate(tempoRate(Number($(`bpm-${id}`).value), Number($(`bpm-${other.id}`).value), other.audio.playbackRate)); error(''); }
    catch (failure) { error(failure.message); }
  };
  for (let i = 0; i < 3; i++) $(`eq-${id}-${i}`).oninput = () => eq(i);
  for (let i = 0; i < 4; i++) $(`hot-${id}-${i}`).onclick = event => {
    if (event.shiftKey) hot[i] = null;
    else if (hot[i] === null) hot[i] = audio.currentTime;
    else seek(hot[i]);
    hotLabels();
  };
  const angle = event => { const r = jog.getBoundingClientRect(); return Math.atan2(event.clientY - r.top - r.height / 2, event.clientX - r.left - r.width / 2) * 180 / Math.PI; };
  jog.onpointerdown = event => {
    if (jog.getAttribute('aria-disabled') === 'true' || event.button !== 0 || drag) return;
    const resume = !audio.paused; pause(deck);
    drag = { pointer: event.pointerId, angle: angle(event), resume, revision: deck.revision };
    jog.setPointerCapture(event.pointerId); event.preventDefault(); jog.focus();
  };
  jog.onpointermove = event => {
    if (!drag || drag.pointer !== event.pointerId || drag.revision !== deck.revision) return;
    const next = angle(event), delta = ((next - drag.angle + 540) % 360) - 180;
    seek(audio.currentTime + delta / 200); drag.angle = next;
  };
  jog.onpointerup = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const previous = drag; drag = null;
    if (previous.resume && previous.revision === deck.revision) start(deck);
  };
  jog.onpointercancel = jog.onlostpointercapture = () => { drag = null; };
  jog.onkeydown = event => {
    if (jog.getAttribute('aria-disabled') === 'true') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') seek(audio.currentTime + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1 : .1));
    else if (event.key === 'Home') seek(0);
    else if (event.key === 'End') seek(deck.duration);
    else return;
    event.preventDefault();
  };
  const scope = $(`scope-${id}`), painter = scope.getContext('2d'), samples = new Float32Array(2048);
  let last = 0;
  function draw(now) {
    if (now - last > 33) {
      last = now; $(`vinyl-${id}`).style.transform = `rotate(${(deck.prepared ? deck.sessionTime || 0 : audio.currentTime || 0) * 200 % 360}deg)`;
      samples.fill(0);
      if (context()?.state === 'running' && (!audio.paused || deck.sessionPlaying)) mixer()?.strips[id === 'a' ? 0 : 1].scope.getFloatTimeDomainData(samples);
      painter.clearRect(0, 0, scope.width, scope.height); painter.beginPath();
      painter.strokeStyle = id === 'a' ? '#61d4e4' : '#f9a66c'; painter.lineWidth = 1.5;
      for (let i = 0; i < samples.length; i++) { const x = i * scope.width / samples.length, y = scope.height * (.5 - samples[i] * .45); i ? painter.lineTo(x, y) : painter.moveTo(x, y); }
      painter.stroke();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
