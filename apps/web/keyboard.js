import { PATCHES, DRUMS, PERCUSSION, noteName, playable, createRack } from './instrument-rack.js';
import { updateInstrumentFX } from './mixer.js';
const $ = id => document.getElementById(id);
export function attachKeyboard({ graph, context, mixer, levels, masterControls }) {
  let node, loading = false, nextId = 1, root = 60, sustain = false;
  const held = new Map(), deferred = new Set(), keys = new Map();
  const letters = 'awsedftgyhujk';
  const send = data => node?.port.postMessage(data);
  const status = message => { $('instrument-status').textContent = message; };
  const paint = button => button.setAttribute('aria-pressed', String([...held.values()].some(note => note.button === button)));
  function release(token) {
    const note = held.get(token); if (!note) return;
    held.delete(token); paint(note.button);
    if (sustain) deferred.add(note.id); else send({ type: 'off', id: note.id });
  }
  function panic() {
    send({ type: 'panic' }); held.clear(); deferred.clear(); sustain = false;
    $('sustain').setAttribute('aria-pressed', 'false');
    for (const button of document.querySelectorAll('.piano-key,.drum-pad')) button.setAttribute('aria-pressed', 'false');
  }
  async function press(token, button, pitch, patch) {
    if (!node || held.has(token) || button.disabled) return;
    const note = { id: nextId++, button };
    if (nextId > 0xffffffff) nextId = 1;
    held.set(token, note); paint(button);
    try {
      if (context().state !== 'running') await context().resume();
      if (held.get(token) !== note) return;
      if (context().state !== 'running') throw new Error('Audio is suspended. Tap a key to retry.');
      send({ type: 'note', id: note.id, patch, pitch, velocity: Number($('velocity').value) });
    } catch (error) { release(token); status(error.message); }
  }
  function bind(button, pitch, patch) {
    button.disabled = true; button.setAttribute('aria-pressed', 'false');
    button.onpointerdown = event => {
      if (event.button !== 0) return;
      event.preventDefault(); button.focus(); button.setPointerCapture(event.pointerId);
      press(`pointer-${event.pointerId}`, button, pitch, patch ?? Number($('patch').value));
    };
    button.onpointerup = button.onpointercancel = button.onlostpointercapture = event => release(`pointer-${event.pointerId}`);
    button.onkeydown = event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); if (!event.repeat) press(`button-${pitch}-${patch}`, button, pitch, patch ?? Number($('patch').value));
    };
    button.onkeyup = event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); release(`button-${pitch}-${patch}`); } };
    button.onblur = () => release(`button-${pitch}-${patch}`);
  }
  for (const [name, patch] of PATCHES) $('patch').add(new Option(name, patch));
  for (let pitch = 21; pitch <= 108; pitch++) {
    const button = document.createElement('button');
    button.className = `piano-key${[1,3,6,8,10].includes(pitch % 12) ? ' black' : ''}`;
    button.textContent = noteName(pitch); button.setAttribute('aria-label', noteName(pitch)); button.dataset.pitch = pitch;
    bind(button, pitch); keys.set(pitch, button); $('keyboard').append(button);
  }
  for (const patch of [9, 10, 12]) for (const [name, pitch] of patch === 12 ? PERCUSSION : DRUMS) {
    const button = document.createElement('button'); button.className = 'drum-pad';
    button.innerHTML = `${name}<small>${patch === 9 ? 'ACOUSTIC' : patch === 10 ? 'ELECTRONIC' : 'PERCUSSION'}</small>`;
    bind(button, pitch, patch); $('drum-pads').append(button);
  }
  function availability() {
    for (const id of ['patch', 'velocity', 'rack-level', 'sustain', 'panic', 'octave-down', 'octave-up', 'rack-tone', 'rack-echo', 'rack-delay', 'rack-fx-reset']) $(id).disabled = !node;
    for (const [pitch, button] of keys) button.disabled = !node || !playable(Number($('patch').value), pitch);
    for (const button of $('drum-pads').children) button.disabled = !node;
    $('mouth').disabled = !node || Number($('patch').value) !== 11;
    $('octave-down').disabled ||= root <= 24; $('octave-up').disabled ||= root >= 96;
  }
  function octave(delta) {
    panic(); root = Math.max(24, Math.min(96, root + delta));
    $('octave-name').textContent = `${noteName(root)}–${noteName(root + 12)}`;
    const scroller = document.querySelector('.keyboard-scroll'); scroller.scrollLeft = keys.get(root).offsetLeft - $('keyboard').offsetLeft - 10;
    availability();
  }
  window.addEventListener('resize', () => {
    const scroller = document.querySelector('.keyboard-scroll');
    scroller.scrollLeft = keys.get(root).offsetLeft - $('keyboard').offsetLeft - 10;
  });
  $('load-instruments').onclick = async () => {
    if (node || loading) return;
    loading = true; $('load-instruments').disabled = true; status('Preparing the instrument bank…');
    try {
      graph(); await context().resume(); node = await createRack(context(), mixer().rackFX.input);
      node.addEventListener('processorerror', () => {
        panic(); node.disconnect(); node.port.close(); node = null; availability(); masterControls();
        status('The instrument engine stopped. Your decks remain available. Reload to prepare instruments again.');
      }, { once: true });
      node.port.onmessage = ({ data }) => { if (data.type === 'rejected') status('Voice limit reached. Release notes or use All notes off.'); };
      levels(); availability(); octave(0); masterControls();
      $('load-instruments').textContent = 'Instruments ready'; status('Ready · 88 keys, ten sounds and twelve drum pads.');
    } catch (error) { status(error.message); $('load-instruments').disabled = false; }
    finally { loading = false; }
  };
  $('patch').onchange = () => {
    panic();
    if (Number($('patch').value) === 11) { root = 36; octave(0); status('Talk bass · C2 register. Hold a key and move Mouth shape. No microphone needed.'); }
    else status('Ready · play keys and pads.');
    availability();
  };
  $('mouth').oninput = () => {
    const position = Number($('mouth').value);
    $('mouth-value').textContent = position < .25 ? 'OO' : position > .75 ? 'EE' : 'AH';
    send({ type: 'mouth', position });
  };
  $('velocity').oninput = () => { $('velocity-value').textContent = $('velocity').value; };
  $('rack-level').oninput = levels;
  function effects() {
    const tone = Number($('rack-tone').value), echo = Number($('rack-echo').value), milliseconds = Number($('rack-delay').value);
    $('rack-tone-value').textContent = tone === 100 ? 'Open' : `${Math.round(200 * 100 ** (tone / 100))} Hz`;
    $('rack-echo-value').textContent = echo === 0 ? 'Off' : `${Math.round(echo * 100)}%`;
    $('rack-delay-value').textContent = `${milliseconds} ms`;
    if (mixer()) updateInstrumentFX(context(), mixer().rackFX, tone, echo, milliseconds);
  }
  for (const id of ['rack-tone', 'rack-echo', 'rack-delay']) $(id).oninput = effects;
  $('rack-fx-reset').onclick = () => {
    $('rack-tone').value = 100; $('rack-echo').value = 0; $('rack-delay').value = 300; effects();
  };
  $('sustain').onclick = () => {
    sustain = !sustain; $('sustain').setAttribute('aria-pressed', String(sustain));
    if (!sustain) { for (const id of deferred) send({ type: 'off', id }); deferred.clear(); }
  };
  $('panic').onclick = panic;
  $('octave-down').onclick = () => octave(-12); $('octave-up').onclick = () => octave(12);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable) return;
    const index = letters.indexOf(event.key.toLowerCase()); if (event.key.length !== 1 || index < 0) return;
    event.preventDefault(); const pitch = root + index; press(`key-${event.code}`, keys.get(pitch), pitch, Number($('patch').value));
  });
  window.addEventListener('keyup', event => release(`key-${event.code}`));
  window.addEventListener('blur', panic); window.addEventListener('pagehide', panic);
  document.addEventListener('visibilitychange', () => { if (document.hidden) panic(); });
  return { ready: () => !!node, panic };
}
