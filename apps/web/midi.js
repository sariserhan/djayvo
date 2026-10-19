export function midiMessage(data) {
  if (!data || data.length !== 3 || ![...data].every(Number.isInteger) ||
      data[0] < 0x80 || data[0] > 0xbf || data[1] < 0 || data[1] > 127 || data[2] < 0 || data[2] > 127) return null;
  const [status, note, value] = data, channel = status & 15, type = status >> 4;
  if (type === 8 || type === 9) return { type: type === 8 || value === 0 ? 'off' : 'note', channel, note, value };
  if (type === 11 && [64, 120, 121, 123].includes(note)) return { type: 'control', channel, note, value };
  return null;
}

export function attachMidi({ message, reset }) {
  const enable = document.getElementById('midi-enable'), select = document.getElementById('midi-input');
  const status = document.getElementById('midi-status');
  let access, input, revision = 0, enabled = false;
  const close = port => { if (port) { port.onmidimessage = null; port.close().catch(() => {}); } };
  function detach() { revision++; reset(); close(input); input = null; }
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
        const decoded = midiMessage(event.data); if (decoded) message(decoded);
      };
      status.textContent = `Connected: ${port.name || 'MIDI input'}. Play while this page is focused.`;
    } catch (error) {
      if (version !== revision) return;
      detach(); select.value = ''; status.textContent = `Could not open MIDI input: ${error.message}. Choose an input to retry.`;
    }
  };
  window.addEventListener('pagehide', disable);
}
