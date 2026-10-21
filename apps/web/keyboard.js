import {validPattern} from './step-sequence.js';
import { PATCHES, DRUMS, PERCUSSION, noteName, playable, createRack } from './instrument-rack.js';
import { updateToneEcho, clearEcho } from './mixer.js';
import { attachMidi } from './midi.js';
import { resumeAudio } from './audio.js';
import { attachInstrumentTake } from './instrument-take.js';
const $ = id => document.getElementById(id);
export function attachKeyboard({ graph, context, mixer, levels, masterControls, getPhrase, onSourcesChanged = () => {}, onNote = () => {} }) {
  let node, loading = false, nextId = 1, root = 60,sequenceRequest=0;
  const held = new Map(), deferred = new Map(), pedals = new Set(), keys = new Map(), pads = new Map();
  const letters = 'awsedftgyhujk';
  const send = data => node?.port.postMessage(data);
  const status = message => { $('instrument-status').textContent = message; };
  const paint = button => button.setAttribute('aria-pressed', String([...held.values()].some(note => note.button === button)));
  function release(token) {
    const note = held.get(token); if (!note) return;
    held.delete(token); paint(note.button);
    if (pedals.has(note.group)) deferred.set(note.id, note); else send({ type: 'off', id: note.id });
  }
  function pedal(group, down) {
    if (down) pedals.add(group);
    else {
      pedals.delete(group);
      for (const [id, note] of deferred) if (note.group === group) { send({ type: 'off', id }); deferred.delete(id); }
    }
  }
  function stopGroup(group) {
    pedal(group, false);
    for (const [token, note] of held) if (note.group === group) release(token);
  }
  function resetMidi() { for (let channel = 0; channel < 16; channel++) stopGroup(`midi-${channel}`); }
  function panic() {
    sequenceRequest++;
    send({ type: 'panic' });$('sequence-stop').disabled=true;$('sequence-start').disabled=!node;$('sequence-status').textContent='Pattern stopped.'; held.clear(); deferred.clear(); pedals.clear();
    $('sustain').setAttribute('aria-pressed', 'false');
    for (const button of document.querySelectorAll('.piano-key,.drum-pad')) button.setAttribute('aria-pressed', 'false');
  }
  const take = attachInstrumentTake({ context, getNode: () => node, panic, getPhrase });
  async function press(token, button, pitch, patch, velocity = Number($('velocity').value), group = 'local') {
    if (!node || held.has(token) || !button || button.disabled) return;
    const note = { id: nextId++, button, group };
    if (nextId >= 0xffffff00) nextId = 1;
    held.set(token, note); paint(button);
    try {
      if (context().state !== 'running') await resumeAudio(context());
      if (held.get(token) !== note) return;
      if (context().state !== 'running') throw new Error('Audio is suspended. Tap a key to retry.');
      send({ type: 'note', id: note.id, patch, pitch, velocity });onNote();
    } catch (error) { if (held.get(token) === note) { release(token); status(error.message); } }
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
    bind(button, pitch, patch); pads.set(`${patch}-${pitch}`, button); $('drum-pads').append(button);
  }
  function availability() {
    take.refresh();$('sequence-start').disabled=!node;
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
      graph(); await resumeAudio(context()); node = await createRack(context(), mixer().rackFX.input);
      node.addEventListener('processorerror', () => {
        take.clear('Instrument engine interrupted. Take discarded.');
        panic(); node.disconnect(); node.port.close(); node = null; onSourcesChanged(); availability(); masterControls();
        status('The instrument engine stopped. Your decks remain available. Reload to prepare instruments again.');
      }, { once: true });
      node.port.onmessage = ({ data }) => {
        if (data.type === 'rejected') status('Voice limit reached. Release notes or use All notes off.');
        if(data.type==='sequence-started'){$('sequence-start').disabled=true;$('sequence-stop').disabled=false;$('sequence-status').textContent='Pattern playing. Stops when the page loses focus.';}
        if(data.type==='sequence-stopped'){$('sequence-start').disabled=!node;$('sequence-stop').disabled=true;$('sequence-status').textContent=data.message||'Pattern stopped.';}
        take.message(data);
      };
      onSourcesChanged(); levels(); availability(); octave(0); masterControls();
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
    if (mixer()) updateToneEcho(context(), mixer().rackFX, tone, echo, milliseconds);
  }
  for (const id of ['rack-tone', 'rack-echo', 'rack-delay']) $(id).oninput = effects;
  $('rack-fx-reset').onclick = () => {
    if (mixer()) clearEcho(context(), mixer().rackFX);
    $('rack-tone').value = 100; $('rack-echo').value = 0; $('rack-delay').value = 300; effects();
  };
  $('sustain').onclick = () => {
    pedal('local', !pedals.has('local')); $('sustain').setAttribute('aria-pressed', String(pedals.has('local')));
  };
  attachMidi({ reset: resetMidi, message: ({ type, channel, note, value }) => {
    if (!node) return;
    const group = `midi-${channel}`, token = `${group}-${note}`;
    if (type === 'control') {
      if (note === 64) pedal(group, value >= 64);
      else if (note === 120) stopGroup(group);
      else if (note === 121) pedal(group, false);
      else if (note === 123) for (const [heldToken, heldNote] of held) if (heldNote.group === group) release(heldToken);
    } else if (type === 'off') release(token);
    else {
      // shortcut: channel-10 note layout is fixed; extend when alternate pad layouts are required.
      const patch = channel === 9 ? (PERCUSSION.some(([, pitch]) => pitch === note) ? 12 : Number($('midi-kit').value)) : Number($('patch').value);
      const button = channel === 9 ? pads.get(`${patch}-${note}`) : keys.get(note);
      if (!button || button.disabled) return;
      const previous = held.get(token);
      if (previous) { held.delete(token); send({ type: 'off', id: previous.id }); }
      press(token, button, note, patch, value, group);
    }
  } });
  $('midi-kit').onchange = () => stopGroup('midi-9');
  for(let step=0;step<16;step++){
    const label=document.createElement('label'),select=document.createElement('select');label.textContent=`Step ${step+1}`;select.id=`sequence-step-${step}`;select.add(new Option('Rest',''));
    for(let pitch=21;pitch<=108;pitch++)select.add(new Option(noteName(pitch),pitch));label.append(select);$('sequence-steps').append(label);
  }
  const pattern=()=>({tempo:Number($('sequence-tempo').value),notes:Array.from({length:16},(_,i)=>$(`sequence-step-${i}`).value===''?null:Number($(`sequence-step-${i}`).value))});

  $('sequence-start').onclick=async()=>{
    const current=++sequenceRequest;if(!node)return;
    try{const value=pattern();if(!validPattern(value))throw Error('Choose a tempo from 40–240 BPM.');await resumeAudio(context());if(current!==sequenceRequest||document.hidden)return;send({type:'sequence-start',pattern:value,patch:Number($('patch').value),velocity:Number($('velocity').value)});}
    catch(error){$('sequence-status').textContent=error.message;}
  };
  $('sequence-stop').onclick=()=>{sequenceRequest++;panic();};
  function restorePattern(value){if(!value)return;if(!validPattern(value))throw Error('Saved sequence is damaged.');$('sequence-tempo').value=value.tempo;value.notes.forEach((note,i)=>{$(`sequence-step-${i}`).value=note===null?'':note;});}
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
  return { recoveryPattern:pattern,restorePattern,recoveryRoot:()=>root, restoreSettings:(savedRoot=60)=>{root=savedRoot;panic();effects();$('velocity').oninput();$('mouth').oninput();octave(0);}, ready: () => !!node, sourceAsset: () => node ? { sha256: node.engineHash, bytes: node.engineBytes } : null, panic, interrupt: take.interrupt, sourceChanged: take.sourceChanged };
}
