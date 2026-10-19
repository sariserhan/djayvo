export function midiMessage(data) {
  if (!data || data.length !== 3 || ![...data].every(Number.isInteger) ||
      data[0] < 0x80 || data[0] > 0xbf || data[1] < 0 || data[1] > 127 || data[2] < 0 || data[2] > 127) return null;
  const [status, note, value] = data, channel = status & 15, type = status >> 4;
  if (type === 8 || type === 9) return { type: type === 8 || value === 0 ? 'off' : 'note', channel, note, value };
  if (type === 11 && (note < 120 || [120, 121, 123].includes(note))) return { type: 'control', channel, note, value };
  return null;
}

// Absolute 7-bit controls pick up the screen value before changing it.
export function midiPickup(binding, value, current, min, max, step) {
  if (!Number.isInteger(value) || value < 0 || value > 127 ||
      ![current, min, max, step].every(Number.isFinite) || max <= min || step <= 0 || current < min || current > max)
    throw new Error('Invalid MIDI control range.');
  if (binding.last !== undefined && binding.last !== current) { binding.latched = false; binding.previous = null; }
  binding.last = current;
  const target = (current - min) / (max - min) * 127;
  binding.latched ||= Math.abs(value - target) <= 1 ||
    (binding.previous != null && (binding.previous - target) * (value - target) <= 0);
  binding.previous = value;
  if (!binding.latched) return null;
  const result = Math.max(min, Math.min(max, min + Math.round((value / 127 * (max - min)) / step) * step));
  binding.last = Number(result.toFixed(6));
  return binding.last;
}

export function attachMidi({ message, reset }) {
  const enable = document.getElementById('midi-enable'), select = document.getElementById('midi-input');
  const status = document.getElementById('midi-status');
  const target = document.getElementById('midi-target'), learn = document.getElementById('midi-learn');
  const forget = document.getElementById('midi-forget'), list = document.getElementById('midi-bindings');
  const learnStatus = document.getElementById('midi-learn-status');
  const targets = new Map([
    ['crossfade', 'Crossfader'], ['master', 'Master level'], ['level-a', 'Deck A level'], ['level-b', 'Deck B level'],
    ['tone-a', 'Deck A tone'], ['echo-a', 'Deck A echo'], ['delay-a', 'Deck A echo spacing'],
    ['tone-b', 'Deck B tone'], ['echo-b', 'Deck B echo'], ['delay-b', 'Deck B echo spacing'],
    ['c-level', 'Performance C level'], ['rack-level', 'Instrument level'], ['rack-tone', 'Instrument tone'],
    ['rack-echo', 'Instrument echo'], ['rack-delay', 'Instrument echo spacing'], ['mouth', 'Talk bass mouth'], ['velocity', 'Computer/touch velocity'],
    ...['a', 'b'].flatMap(id => ['Low', 'Mid', 'High'].map((band, i) => [`eq-${id}-${i}`, `Deck ${id.toUpperCase()} ${band} EQ`]))
  ]);
  for (const [id, label] of targets) target.add(new Option(label, id));
  const bindings = new Map();
  let access, input, revision = 0, enabled = false, learning = '';
  function renderBindings() {
    learn.disabled = !input?.onmidimessage;
    learn.textContent = learning ? 'Cancel learn' : 'Learn control';
    target.disabled = !!learning;
    forget.disabled = bindings.size === 0 && !learning;
    list.replaceChildren();
    for (const [key, binding] of bindings) {
      const [channel, cc] = key.split(':').map(Number), item = document.createElement('li');
      item.textContent = `Channel ${channel + 1} · CC ${cc} → ${targets.get(binding.target)} · ${binding.latched ? 'active' : 'move to pick up'}`;
      list.append(item);
    }
  }
  function rearm() {
    if (learning) learnStatus.textContent = 'Learning cancelled.';
    learning = '';
    for (const binding of bindings.values()) { binding.latched = false; binding.previous = null; binding.last = undefined; }
    renderBindings();
  }
  function clearBindings() {
    bindings.clear(); rearm(); learnStatus.textContent = 'No mappings. Choose a control, then Learn control and move a knob or fader.';
  }
  learn.onclick = () => {
    if (!input?.onmidimessage) return;
    learning = learning ? '' : target.value;
    learnStatus.textContent = learning ? `Move a knob or fader for ${targets.get(learning)}. Notes and sustain still play; the learning message will not change the control.` : 'Learning cancelled.';
    renderBindings();
  };
  forget.onclick = clearBindings;
  function control(decoded) {
    if (decoded.type !== 'control' || decoded.note === 64 || decoded.note >= 120) return false;
    const key = `${decoded.channel}:${decoded.note}`;
    if (learning) {
      for (const [oldKey, binding] of bindings) if (binding.target === learning) bindings.delete(oldKey);
      bindings.set(key, { target: learning, previous: decoded.value, latched: false });
      learning = ''; renderBindings();
      learnStatus.textContent = 'Mapped. Move through the current screen value to pick up control. Remapping replaces any existing assignment.';
      return true;
    }
    const binding = bindings.get(key); if (!binding) return false;
    const node = document.getElementById(binding.target), wasLatched = binding.latched;
    if (node.disabled) { binding.latched = false; binding.previous = null; binding.last = undefined; }
    else {
      const value = midiPickup(binding, decoded.value, Number(node.value), Number(node.min), Number(node.max), Number(node.step || 1));
      if (value !== null) { node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    if (wasLatched !== binding.latched) renderBindings();
    return true;
  }
  for (const id of targets.keys()) document.getElementById(id).addEventListener('input', event => {
    if (!event.isTrusted) return;
    for (const binding of bindings.values()) if (binding.target === id) { binding.latched = false; binding.previous = null; binding.last = undefined; }
    renderBindings();
  });
  window.addEventListener('blur', rearm);
  document.addEventListener('visibilitychange', () => { if (document.hidden) rearm(); });
  renderBindings();
  const close = port => { if (port) { port.onmidimessage = null; port.close().catch(() => {}); } };
  function detach() { revision++; reset(); close(input); input = null; clearBindings(); }
  function refresh() {
    const selected = input?.id || '';
    select.replaceChildren(new Option('Choose an input', ''));
    for (const port of access.inputs.values()) if (port.state === 'connected')
      select.add(new Option(port.name || 'Unnamed MIDI input', port.id));
    if (input?.state === 'disconnected') {
      detach(); status.textContent = 'Controller disconnected. Notes released; choose an input to reconnect.';
    } else select.value = selected;
  }
  function disable() {
    enabled = false; detach();
    if (access) access.onstatechange = null;
    access = null; select.replaceChildren(new Option('Choose an input', '')); select.disabled = true;
    enable.textContent = 'Enable MIDI'; status.textContent = 'MIDI off. Computer keys and touch remain available.';
  }
  enable.disabled = !navigator.requestMIDIAccess;
  if (enable.disabled) status.textContent = 'MIDI is unavailable in this browser. Use computer keys or touch, or a browser with Web MIDI on HTTPS/localhost.';
  enable.onclick = async () => {
    if (enabled) { disable(); return; }
    enabled = true; const version = ++revision;
    enable.textContent = 'Disable MIDI'; status.textContent = 'Waiting for MIDI permission…';
    try {
      const granted = await navigator.requestMIDIAccess({ sysex: false, software: false });
      if (!enabled || version !== revision) return;
      access = granted; access.onstatechange = refresh; refresh(); select.disabled = false;
      status.textContent = 'Choose one input. Prepare instruments before playing. Device names stay in this tab.';
    } catch (error) {
      if (version !== revision) return;
      disable(); status.textContent = `MIDI unavailable: ${error.message}. You can retry or use computer keys and touch.`;
    }
  };
  select.onchange = async () => {
    const id = select.value; detach();
    if (!enabled || !id) { status.textContent = 'No MIDI input selected.'; return; }
    const port = access.inputs.get(id), version = revision;
    if (!port || port.state !== 'connected') { refresh(); return; }
    input = port; status.textContent = 'Opening MIDI input…';
    try {
      await port.open();
      if (version !== revision || input !== port) {
        if (input !== port) close(port);
        return;
      }
      port.onmidimessage = event => {
        if (input !== port || document.hidden || !document.hasFocus()) return;
        const decoded = midiMessage(event.data); if (decoded && !control(decoded)) message(decoded);
      };
      renderBindings();
      status.textContent = `Connected: ${port.name || 'MIDI input'}. Play while this page is focused.`;
    } catch (error) {
      if (version !== revision) return;
      detach(); select.value = ''; status.textContent = `Could not open MIDI input: ${error.message}. Choose an input to retry.`;
    }
  };
  window.addEventListener('pagehide', disable);
}
