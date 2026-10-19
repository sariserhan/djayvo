import assert from 'node:assert/strict';

// Synthetic ports exercise browser/audio integration without claiming physical MIDI evidence.
export function fakeMidi() {
  window.nativeMidiAvailable = typeof navigator.requestMIDIAccess === 'function';
  window.midiRequests = []; window.midiMessages = []; window.midiMode = 'ready';
  const port = id => ({ id, name: `Test controller ${id}`, state: 'connected', opens: 0, closes: 0,
    open() { this.opens++; if (this.fail) return Promise.reject(Error('test open failure')); if (this.hold) return new Promise(resolve => { this.finish = resolve; }); return Promise.resolve(this); },
    close() { this.closes++; return Promise.resolve(this); },
    emit(data) { this.onmidimessage?.({ data: new Uint8Array(data) }); }
  });
  window.midiPorts = [port('one'), port('two')];
  window.midiAccess = { inputs: new Map(midiPorts.map(p => [p.id, p])), onstatechange: null };
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: location.search.includes('midi=unsupported') ? undefined : options => {
    midiRequests.push(options);
    if (midiMode === 'denied') return Promise.reject(Error('test permission denied'));
    if (midiMode === 'pending') return new Promise(resolve => { window.grantMidi = () => resolve(midiAccess); });
    return Promise.resolve(midiAccess);
  } });
  const Native = window.AudioWorkletNode;
  window.AudioWorkletNode = class extends Native {
    constructor(...args) {
      super(...args); const send = this.port.postMessage.bind(this.port);
      this.port.postMessage = data => { midiMessages.push(data); return send(data); };
    }
  };
}

export async function verifyMidi(page, check, peak) {
  const emit = data => page.evaluate(data => midiPorts[0].emit(data), data);
  const sent = () => page.evaluate(() => midiMessages);
  const clear = () => page.evaluate(() => { midiMessages.length = 0; });
  const connect = async (id = 'one') => {
    await page.locator('#midi-input').selectOption(id);
    await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
  };
  assert.equal(await page.evaluate(() => midiRequests.length), 0);
  await page.evaluate(() => { midiMode = 'denied'; });
  await page.locator('#midi-enable').click();
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.includes('test permission denied'));
  assert.equal(await page.locator('#midi-input').isDisabled(), true);
  await page.evaluate(() => { midiMode = 'pending'; });
  await page.locator('#midi-enable').click(); await page.locator('#midi-enable').click();
  await page.evaluate(() => grantMidi());
  assert.equal(await page.locator('#midi-input').isDisabled(), true);
  assert.equal(await page.evaluate(() => midiPorts[0].opens), 0);
  check('MIDI opt-in, denied permission and late permission cancellation preserve manual controls');
  await page.evaluate(() => { midiMode = 'ready'; });
  await page.locator('#midi-enable').click();
  assert.deepEqual(await page.evaluate(() => midiRequests), Array(3).fill({ sysex: false, software: false }));
  await connect(); await page.locator('#patch').selectOption('6'); await clear();
  await emit([0x90, 60, 112]);
  await page.waitForFunction(() => {
    const pcm = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(pcm);
    return pcm.some(value => Math.abs(value) > .001);
  });
  assert.ok(await peak() > .001);
  assert.equal(await page.locator('[data-pitch="60"]').getAttribute('aria-pressed'), 'true');
  assert.equal((await sent())[0].velocity, 112);
  await emit([0x90, 60, 0]); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('MIDI notes drive real C++ worklet audio with velocity and zero-velocity note-off');
  await verifyMidiLearn(page, check, peak);

  await clear();
  await emit([0xb0, 64, 127]); await emit([0x90, 60, 90]); await emit([0x80, 60, 0]);
  await emit([0x91, 64, 72]); await emit([0x81, 64, 0]);
  const notes = (await sent()).filter(m => m.type === 'note');
  assert.equal((await sent()).filter(m => m.type === 'off').length, 1);
  assert.equal((await sent()).find(m => m.type === 'off').id, notes[1].id);
  await page.waitForTimeout(1100); assert.ok(await peak() > .001);
  await emit([0xb0, 64, 0]); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#sustain').getAttribute('aria-pressed'), 'false');
  check('MIDI sustain is isolated by channel and from computer/touch sustain');
  await clear(); await emit([0x90, 60, 100]); await emit([0x90, 60, 80]);
  assert.deepEqual((await sent()).map(m => m.type), ['note', 'off', 'note']);
  await emit([0xb0, 123, 0]); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await emit([0xb0, 64, 127]); await emit([0x90, 60, 100]); await emit([0xb0, 123, 0]);
  await page.waitForTimeout(200); assert.ok(await peak() > .001);
  await emit([0xb0, 121, 0]); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await emit([0x90, 60, 100]); await emit([0xb0, 120, 0]); await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('retrigger and MIDI CC123/121/120 release held and sustained voices safely');
  await page.locator('#patch').selectOption('4'); await clear();
  for (const data of [[0x90,21,100],[0x99,60,100],[0xe0,0,127],[0xf0,0,0xf7]]) await emit(data);
  assert.deepEqual(await sent(), []);
  await page.locator('#midi-kit').selectOption('10'); await clear();
  await emit([0x99, 36, 127]); await page.waitForTimeout(35); assert.ok(await peak() > .00001);
  await emit([0x89, 36, 0]); await emit([0x99, 39, 100]); await emit([0x89, 39, 0]);
  assert.deepEqual((await sent()).filter(m => m.type === 'note').map(m => [m.patch, m.pitch, m.velocity]), [[10,36,127],[12,39,100]]);
  check('channel-10 drums/percussion mapping produces audio; unsupported notes and messages are ignored');
  await page.locator('#patch').selectOption('6');
  await page.locator('.keyboard-scroll').focus(); await page.keyboard.down('a');
  await emit([0x90, 64, 100]); await connect('two');
  assert.equal(await page.locator('[data-pitch="60"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-pitch="64"]').getAttribute('aria-pressed'), 'false');
  await page.keyboard.up('a'); await page.locator('#panic').click();
  await page.evaluate(() => { midiPorts[1].state = 'disconnected'; midiAccess.onstatechange({ port: midiPorts[1] }); });
  assert.match(await page.locator('#midi-status').textContent(), /disconnected/);
  await page.evaluate(() => { midiPorts[1].state = 'connected'; midiAccess.onstatechange({ port: midiPorts[1] }); });
  assert.equal(await page.locator('#midi-input').inputValue(), '');
  await connect(); await emit([0xb0,64,127]); await emit([0x90,60,100]); await emit([0x80,60,0]);
  await page.evaluate(() => { midiPorts[0].state = 'disconnected'; midiAccess.onstatechange({ port: midiPorts[0] }); });
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('input switching preserves computer notes; unplug clears sustain and requires explicit reconnect');
  await page.evaluate(() => { midiPorts[0].state = 'connected'; midiPorts[0].fail = true; midiAccess.onstatechange({ port: midiPorts[0] }); });
  await page.locator('#midi-input').selectOption('one');
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.includes('test open failure'));
  await page.evaluate(() => { midiPorts[0].fail = false; midiPorts[0].hold = true; });
  await page.locator('#midi-input').selectOption('one');
  await page.locator('#midi-enable').click(); await page.evaluate(() => midiPorts[0].finish());
  assert.equal(await page.evaluate(() => midiPorts[0].onmidimessage), null);
  assert.equal(await page.locator('#midi-input').isDisabled(), true);
  await page.evaluate(() => { midiPorts[0].hold = false; });
  await page.locator('#midi-enable').click(); await connect();
  await emit([0x90,60,100]); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  await emit([0x90,60,100]); await page.locator('#midi-enable').click();
  await page.waitForTimeout(1100); assert.ok(await peak() < .0001);
  check('failed/pending port opens, blur and disabling MIDI release voices without pausing decks');
  assert.equal(await page.locator('#audio-a').evaluate(a => a.paused), false);
  const unsupported = await page.context().newPage();
  try {
    await unsupported.goto(new URL('dj.html?midi=unsupported', page.url()).href);
    assert.equal(await unsupported.locator('#midi-enable').isDisabled(), true);
    assert.match(await unsupported.locator('#midi-status').textContent(), /unavailable/);
    assert.equal(await unsupported.locator('#load-instruments').isDisabled(), false);
  } finally { await unsupported.close(); await page.bringToFront(); }
  check('unsupported MIDI browser keeps clear fallback and existing instrument controls');
  await page.locator('#patch').selectOption('0');
}


export async function verifyMidiLearn(page, check, peak) {
  const emit = data => page.evaluate(data => midiPorts[0].emit(data), data);
  const set = async (id, value) => { await page.locator(`#${id}`).fill(String(value)); await page.locator(`#${id}`).dispatchEvent('input'); };
  const learn = async (target, cc, value, channel = 0) => {
    await page.locator('#midi-target').selectOption(target); await page.locator('#midi-learn').click();
    await emit([0xb0 + channel, cc, value]);
    assert.equal(await page.locator('#midi-learn').textContent(), 'Learn control');
  };
  // Decks keep advancing but were muted by the instrument checks.
  await emit([0x90, 60, 100]); await page.waitForTimeout(150);
  await emit([0xb0, 1, 100]); await page.waitForTimeout(150); assert.ok(await peak() > .001);
  await page.locator('#midi-target').selectOption('rack-level'); await page.locator('#midi-learn').click();
  await emit([0xb0, 64, 127]); await emit([0xb0, 121, 0]);
  assert.equal(await page.locator('#midi-learn').textContent(), 'Cancel learn');
  await emit([0xb0, 7, 0]);
  assert.equal(await page.locator('#rack-level').inputValue(), '0.65');
  await emit([0xb0, 7, 10]); assert.equal(await page.locator('#rack-level').inputValue(), '0.65');
  await emit([0xb1, 7, 127]); assert.equal(await page.locator('#rack-level').inputValue(), '0.65');
  await emit([0xb0, 7, 83]); await emit([0xb0, 7, 0]);
  await page.waitForTimeout(200); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#rack-level').inputValue(), '0');
  assert.match(await page.locator('#midi-bindings').textContent(), /Instrument level · active/);
  await emit([0xb0, 7, 127]); await page.waitForTimeout(150); assert.ok(await peak() > .001);
  await set('rack-level', .4); await emit([0xb0, 7, 120]);
  assert.equal(await page.locator('#rack-level').inputValue(), '0.4');
  await emit([0xb0, 7, 51]); await emit([0xb0, 7, 0]);
  await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  check('MIDI Learn consumes assignment without jumps; channel-specific pickup controls actual audio, manual changes rearm, unmapped/reserved CC preserve notes');
  await learn('rack-level', 8, 0);
  await emit([0xb0, 7, 127]); assert.equal(await page.locator('#rack-level').inputValue(), '0');
  await emit([0xb0, 8, 0]); await emit([0xb0, 8, 127]);
  assert.equal(await page.locator('#rack-level').inputValue(), '1');
  await learn('master', 8, 127);
  assert.equal(await page.locator('#midi-bindings li').count(), 1);
  await emit([0xb0, 8, 95]); await emit([0xb0, 8, 0]);
  await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  assert.equal(await page.locator('#master').inputValue(), '0');
  assert.equal(await page.locator('#rack-level').inputValue(), '1');
  await emit([0xb0, 8, 127]); await page.waitForTimeout(150); assert.ok(await peak() > .001);
  const mouth = await page.locator('#mouth').inputValue();
  assert.equal(await page.locator('#mouth').isDisabled(), true);
  await learn('mouth', 9, 0);
  await emit([0xb0, 9, Math.round(Number(mouth) * 127)]); await emit([0xb0, 9, Number(mouth) > .5 ? 0 : 127]);
  assert.equal(await page.locator('#mouth').inputValue(), mouth);
  await page.locator('#midi-learn').click(); await page.locator('#midi-learn').click();
  await emit([0xb0, 11, 80]); assert.equal(await page.locator('#midi-bindings li').count(), 2);
  check('reassignment replaces old target/controller bindings; disabled sound controls and cancelled learning ignore CC');
  await emit([0x80, 60, 0]); await page.waitForTimeout(1100);
  await set('rack-level', .65); await set('master', .75);
  await learn('level-a', 10, 0);
  await emit([0xb0, 10, 0]); await emit([0xb0, 10, 127]);
  await set('crossfade', 0); await page.waitForTimeout(150); assert.ok(await peak() > .1);
  await learn('crossfade', 11, 127);
  await emit([0xb0, 11, 0]); await emit([0xb0, 11, 127]);
  await page.waitForTimeout(150); assert.ok(await peak() < .0001);
  await emit([0xb0, 11, 0]); await page.waitForTimeout(150); assert.ok(await peak() > .1);
  await learn('tone-a', 12, 127); await emit([0xb0, 12, 127]); await emit([0xb0, 12, 0]);
  assert.equal(await page.locator('#tone-a-value').textContent(), '200 Hz');
  await learn('eq-a-0', 13, 0); await emit([0xb0, 13, 64]); await emit([0xb0, 13, 0]);
  assert.equal(await page.locator('#eq-a-0-value').textContent(), '-12 dB');
  await set('level-a', 0); await set('tone-a', 100); await set('eq-a-0', 0);
  check('learned channel and crossfader controls change media-deck PCM; tone/EQ use existing validated audio controls');
  await page.locator('#midi-learn').click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#midi-learn').textContent(), 'Learn control');
  await emit([0xb0, 8, 127]); assert.equal(await page.locator('#master').inputValue(), '0.75');
  await page.locator('#midi-forget').click();
  await emit([0xb0, 8, 0]); assert.equal(await page.locator('#master').inputValue(), '0.75');
  assert.equal(await page.locator('#midi-bindings li').count(), 0);
  await learn('master', 14, 0);
  await page.locator('#midi-input').selectOption('two');
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
  assert.equal(await page.locator('#midi-bindings li').count(), 0);
  await page.evaluate(() => midiPorts[1].emit([0xb0, 14, 0]));
  assert.equal(await page.locator('#master').inputValue(), '0.75');
  await page.locator('#midi-input').selectOption('one');
  await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected:'));
  check('blur cancels learning/rearms pickup; clear and input switching remove bindings without changing levels');
  const targets = await page.locator('#midi-target option').evaluateAll(options => options.map(option => {
    const node = document.getElementById(option.value);
    return { id: node.id, value: node.value, min: node.min, max: node.max, disabled: node.disabled };
  }));
  for (const [i, target] of targets.entries()) {
    if (!target.disabled) await set(target.id, target.min);
    await learn(target.id, 20 + i, 0);
    await emit([0xb0, 20 + i, 0]); await emit([0xb0, 20 + i, 127]);
    assert.equal(Number(await page.locator(`#${target.id}`).inputValue()), Number(target.disabled ? target.value : target.max), target.id);
    if (!target.disabled) await set(target.id, target.value);
  }
  assert.equal(await page.locator('#midi-bindings li').count(), targets.length);
  await page.locator('#midi-forget').click();
  check('all 23 allowed targets respect range endpoints/default steps; unavailable targets remain unchanged, mappings bounded by target count');

}
