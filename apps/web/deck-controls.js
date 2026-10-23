import { snapToBeat } from './pro-deck-tools.js';
import { setMixerGain } from './mixer.js';
const $ = id => document.getElementById(id);
export function playMedia(audio, current) {
  return new Promise((resolve, reject) => {
    const position = audio.currentTime;
    let pending = true, requested = false, played = false;
    const finish = error => {
      if (!pending) return;
      pending = false; clearInterval(poll); clearTimeout(timer);
      error ? reject(error) : resolve();
    };
    const begin = () => {
      if (!current()) { finish(); return; }
      if (audio.error) { finish(new Error(audio.error.message || 'This browser cannot open that track.')); return; }
      // Let metadata preload finish before Play promotes the native decoder to eager loading.
      if (requested || audio.readyState < 1) return;
      requested = true;
      try { Promise.resolve(audio.play()).then(() => { played = true; }, finish); }
      catch (error) { finish(error); }
    };
    // A resolved play promise can still leave WebKit stuck seeking at EOF.
    const poll = setInterval(() => {
      if (!current()) finish();
      else if (played && (audio.ended || (!audio.paused && !audio.seeking && audio.currentTime !== position))) finish();
      else begin();
    }, 50);
    const timer = setTimeout(() => finish(new Error('The track did not begin playing. Unload it and try again.')), 10000);
    begin();
  });
}
export function tempoRate(own, other, otherRate) {
  if (![own, other].every(n => Number.isFinite(n) && n >= 40 && n <= 240) || !Number.isFinite(otherRate))
    throw new Error('Enter both track tempos between 40 and 240 BPM first.');
  const rate = other * otherRate / own;
  if (rate < .84 || rate > 1.16) throw new Error('Tempo match exceeds the ±16% pitch range.');
  return rate;
}
export function attachDeck(deck, other, { pause, start, mixer, context, scratchStart }) {
  const { id, audio } = deck, jog = $(`jog-${id}`);
  const cueCount = document.querySelectorAll(`[id^=hot-${id}-]`).length;
  deck.gridOrigin=0;deck.quantize=false;deck.echoDivision='manual';
  const cuePosition=()=>deck.quantize?snapToBeat(audio.currentTime,Number($(`bpm-${id}`).value),deck.gridOrigin,deck.duration):audio.currentTime;
  let cue = 0, hot = Array(cueCount).fill(null), taps = [], drag, pendingRate;
  const error = message => { $(`error-${id}`).textContent = message; };
  const seek = position => { if (deck.url && Number.isFinite(position)) audio.currentTime = Math.max(0, Math.min(deck.duration, position)); };
  const rate = value => {
    if(audio.buffer){audio.playbackRate=value;$(`rate-${id}`).value=value;$(`rate-value-${id}`).textContent=`${((value-1)*100).toFixed(1)}%`;return;}
    // shortcut: pitch changes briefly pause audio; use shared-frame transport for continuous pitch.
    $(`rate-${id}`).value = value;
    $(`rate-value-${id}`).textContent = `${value >= 1 ? '+' : ''}${((value - 1) * 100).toFixed(1)}%`;
    if (pendingRate?.url === deck.url) { pendingRate.value = value; return; }
    if (audio.paused) { audio.playbackRate = value; return; }
    pause(deck);
    const change = { value, revision: deck.revision, url: deck.url }; pendingRate = change;
    // Coalesce slider input until pause completes; overlapping native rate seeks can stall WebKit.
    audio.addEventListener('pause', () => {
      if (pendingRate !== change) return;
      pendingRate = null;
      if (change.url !== deck.url) return;
      if (!audio.paused) { rate(change.value); return; }
      audio.playbackRate = change.value;
      if (change.revision === deck.revision) start(deck);
    }, { once: true });
  };
  const eq = band => {
    const value = Number($(`eq-${id}-${band}`).value);
    $(`eq-${id}-${band}-value`).textContent = `${value} dB`;
    if (mixer()) setMixerGain(context(), mixer(), `eq-${id}-${band}`, value);
  };
  const hotLabels = () => hot.forEach((value, index) => {
    const button = $(`hot-${id}-${index}`);if(!button)return;const label = value === null ? 'EMPTY' : `${value.toFixed(1)} s`;
    button.querySelector('small').textContent = label;button.dataset.set=String(value!==null);
    button.setAttribute('aria-label', `${index+1} ${label} — Deck ${id.toUpperCase()} hot cue`);
  });
  deck.resetTransport = () => {
    cue = 0; deck.gridOrigin=0;deck.quantize=false;deck.echoDivision='manual';hot.fill(null); taps = []; drag = null; hotLabels();
    rate(1); deck.loop = false; audio.loop = false; audio.preservesPitch = true;
    $(`keylock-${id}`).checked = true; $(`bpm-${id}`).value = '';
    $(`loop-${id}`).setAttribute('aria-pressed', 'false');
    for (let i = 0; i < 3; i++) { $(`eq-${id}-${i}`).value = 0; eq(i); }
  };
  deck.applyEQ = () => { for (let i = 0; i < 3; i++) eq(i); };
  deck.transportState=()=>({cue,hot:[...hot],gridOrigin:deck.gridOrigin,quantize:deck.quantize,echoDivision:deck.echoDivision});
  deck.restoreTransport=state=>{
    cue=state.cue;hot=Array.from({length:Math.max(cueCount,state.hot.length)},(_,i)=>state.hot[i]??null);deck.gridOrigin=state.gridOrigin??0;deck.quantize=state.quantize??false;deck.echoDivision=state.echoDivision??'manual';hotLabels();
    $(`bpm-${id}`).value=state.bpm;$(`keylock-${id}`).checked=state.keylock;audio.preservesPitch=state.keylock;
    $(`rate-${id}`).value=String(state.rate);deck.loop=state.loop;
    if(audio.buffer)audio.region=state.region;
    audio.loop=state.loop||!!state.region;$(`loop-${id}`).setAttribute('aria-pressed',String(state.loop));
  };
  deck.transportControls = ready => {
    const bpm=Number($(`bpm-${id}`).value),speed=audio.playbackRate;
    $(`rate-value-${id}`).textContent=`${speed>=1?'+':''}${((speed-1)*100).toFixed(1)}%${bpm>=40&&bpm<=240?' · '+(bpm*speed).toFixed(1)+' BPM':''}`;
    for (const prefix of ['rate', 'rate-reset', 'cue', 'set-cue', 'loop', 'bpm', 'tap', 'match', 'keylock']) $(`${prefix}-${id}`).disabled = !ready;
    for(const name of ['beat-loop','beat-roll','loop-exit','jump-back','jump-forward','align','loop-beats'])$(`${name}-${id}`).disabled=!ready||!audio.buffer;
    $(`beat-roll-${id}`).setAttribute('aria-pressed',String(!!audio.roll));
    if(audio.buffer)$(`keylock-${id}`).checked=audio.preservesPitch;
    $(`keylock-${id}`).disabled ||= !!audio.buffer && !audio.processor || !('preservesPitch' in audio);
    for (let i = 0; i < 3; i++) $(`eq-${id}-${i}`).disabled = !ready;
    for (let i = 0; i < cueCount; i++) $(`hot-${id}-${i}`).disabled = !ready;
    jog.setAttribute('aria-disabled', String(!ready));
    jog.setAttribute('aria-valuemax', String(deck.duration));
    jog.setAttribute('aria-valuenow', String(audio.currentTime || 0));
    jog.setAttribute('aria-valuetext', `${(audio.currentTime || 0).toFixed(1)} seconds`);
  };
  $(`rate-${id}`).oninput = event => rate(Number(event.target.value));
  $(`rate-reset-${id}`).onclick = () => rate(1);
  $(`keylock-${id}`).onchange = event => { audio.preservesPitch = event.target.checked; };
  $(`set-cue-${id}`).onclick = () => { try { cue = cuePosition(); $(`cue-${id}`).title = `Return to ${cue.toFixed(1)} seconds`; } catch(e) { error(e.message); } };
  $(`cue-${id}`).onclick = () => { pause(deck); seek(cue); };
  $(`loop-${id}`).onclick = event => { const next=!deck.loop;if(audio.buffer){audio.exitLoop();audio.loop=next;}deck.loop=next;event.currentTarget.setAttribute('aria-pressed',String(next)); };
  audio.addEventListener('transportchange',()=>{if(audio.buffer){deck.loop=audio.loop&&!audio.region;$(`loop-${id}`).setAttribute('aria-pressed',String(deck.loop));}});
  // shortcut: ended-event repeat can gap; use shared-frame transport for beat loops.
  // Native WebKit loop playback stalled after rapid rate/loop changes in testing.
  audio.addEventListener('ended', () => {
    if (deck.loop && deck.playRequested && deck.url && !deck.loading) { pause(deck); start(deck); }
  });
  const bpm=()=>{const value=Number($(`bpm-${id}`).value);if(value<40||value>240)throw Error('Enter the track BPM first.');return value;};
  $(`beat-loop-${id}`).onclick=()=>{try{audio.beatLoop(Number($(`loop-beats-${id}`).value),bpm(),deck.gridOrigin);error('');}catch(e){error(e.message);}};
  $(`beat-roll-${id}`).onclick=()=>{try{if(audio.roll)audio.exitLoop();else audio.startRoll(Number($(`loop-beats-${id}`).value),bpm(),deck.gridOrigin);error('');}catch(e){error(e.message);}};
  $(`loop-exit-${id}`).onclick=()=>audio.exitLoop();
  for(const [name,beats] of [['jump-back',-4],['jump-forward',4]])$(`${name}-${id}`).onclick=()=>{try{seek(audio.currentTime+beats*60/bpm());}catch(e){error(e.message);}};
  $(`align-${id}`).onclick=()=>{try{const beat=60/bpm(),otherBpm=Number($(`bpm-${other.id}`).value),otherBeat=60/otherBpm;if(!other.audio.buffer||otherBpm<40||otherBpm>240||!Number.isFinite(otherBeat))throw Error('Enable beat controls and enter the BPM on both decks first.');seek(deck.gridOrigin+Math.floor((audio.currentTime-deck.gridOrigin)/beat)*beat+(((other.audio.currentTime-other.gridOrigin)/otherBeat%1+1)%1)*beat);}catch(e){error(e.message);}};
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
  for (let i = 0; i < cueCount; i++) $(`hot-${id}-${i}`).onclick = event => {
    if (event.shiftKey) hot[i] = null;
    else if (hot[i] === null) { try { hot[i] = cuePosition(); } catch(e) { error(e.message); return; } }
    else seek(hot[i]);
    hotLabels();
  };
  const angle = event => { const r = jog.getBoundingClientRect(); return Math.atan2(event.clientY - r.top - r.height / 2, event.clientX - r.left - r.width / 2) * 180 / Math.PI; };
  jog.onpointerdown = async event => {
    if (jog.getAttribute('aria-disabled') === 'true' || event.button !== 0 || drag) return;
    const resume = !audio.paused;
    if(!audio.processor)pause(deck);
    const current=drag = { pointer: event.pointerId, angle: angle(event), time:event.timeStamp, resume, revision: deck.revision, scratch:!!audio.processor };
    jog.setPointerCapture(event.pointerId); event.preventDefault(); jog.focus();
    if(current.scratch)try{await scratchStart();if(drag===current&&current.revision===deck.revision&&jog.getAttribute('aria-disabled')!=='true')audio.beginScratch();}catch(e){drag=null;error(e.message);}
  };
  jog.onpointermove = event => {
    if (!drag || drag.pointer !== event.pointerId || drag.revision !== deck.revision) return;
    const next = angle(event), delta = ((next - drag.angle + 540) % 360) - 180;
    if(drag.scratch)audio.scratch(delta/200/Math.max(.008,(event.timeStamp-drag.time)/1000));
    else seek(audio.currentTime + delta / 200);
    drag.angle = next;drag.time=event.timeStamp;
  };
  jog.onpointerup = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const previous = drag; drag = null;
    if(previous.scratch)audio.endScratch(previous.revision===deck.revision);
    else if (previous.resume && previous.revision === deck.revision) start(deck);
  };
  jog.onpointercancel = jog.onlostpointercapture = () => {if(drag?.scratch)audio.endScratch(false);drag = null;};
  window.addEventListener('blur',()=>{if(drag?.scratch)audio.endScratch(false);drag=null;});
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
      painter.strokeStyle = id === 'a' ? '#ffd08a' : '#8dd9f3'; painter.lineWidth = 1.5;
      for (let i = 0; i < samples.length; i++) { const x = i * scope.width / samples.length, y = scope.height * (.5 - samples[i] * .45); i ? painter.lineTo(x, y) : painter.moveTo(x, y); }
      painter.stroke();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
