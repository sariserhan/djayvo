import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function verifyInstrumentFX(page, output, deck = null) {
  const evidence = [];
  for (const mode of ['dry', 'echo-100', 'echo-300', 'echo-800', 'tone', 'sweep', 'mute', 'reset', 'clear', 'clear-stop-fade']) {
    const result = await page.evaluate(async ({ mode, deck }) => {
      const { createMixer, updateToneEcho, clearEcho } = await import('./mixer.js');
      const context = new OfflineAudioContext(2, 48000 * 5, 48000), mixer = createMixer(context);
      const channel = deck === null ? mixer.rack : mixer.channels[deck];
      const fx = deck === null ? mixer.rackFX : mixer.strips[deck].fx;
      channel.gain.value = 1;
      const buffer = context.createBuffer(2, 48000 * 5, 48000);
      const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
      for (let i = 0; i < left.length; i++) {
        left[i] = mode === 'tone' || mode === 'sweep' ? (i >= (mode === 'sweep' ? 0 : 48000) && i < 96000 ? .2 * Math.sin(2 * Math.PI * 8000 * i / 48000) : 0) : i === 48000 ? .2 : 0;
        if (mode === 'clear-stop-fade' && i >= 52800 && i < 53040) left[i] = .2 * (53040 - i) / 240;
        right[i] = -left[i];
      }
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(deck === null ? fx.input : mixer.strips[deck].input); source.start();
      const spacing = mode.startsWith('echo-') ? Number(mode.split('-')[1]) : 300;
      updateToneEcho(context, fx, mode === 'tone' || mode === 'sweep' ? 0 : 100, ['dry', 'tone', 'sweep'].includes(mode) ? 0 : .5, spacing);
      if (mode === 'mute') channel.gain.setValueAtTime(0, 1.1);
      if (mode === 'reset') {
        fx.wet.gain.setTargetAtTime(0, 1.1, .01);
        fx.dry.gain.setTargetAtTime(1, 1.1, .01);
      }
      const cleared = mode.startsWith('clear') ? context.suspend(1.1).then(() => { clearEcho(context, fx); return context.resume(); }) : Promise.resolve();
      const rendered = await context.startRendering();
      await cleared;
      const samples = rendered.getChannelData(0), other = rendered.getChannelData(1);
      let peak = 0, difference = 0, stereoError = 0, latePeak = 0, square = 0;
      for (let i = 0; i < samples.length; i++) {
        if (!Number.isFinite(samples[i]) || !Number.isFinite(other[i])) throw new Error('Nonfinite FX output');
        peak = Math.max(peak, Math.abs(samples[i]));
        difference = Math.max(difference, Math.abs(samples[i] - (left[i] || 0)));
        stereoError = Math.max(stereoError, Math.abs(samples[i] + other[i]));
        if (i >= 60000) latePeak = Math.max(latePeak, Math.abs(samples[i]));
        if (i >= 48000 && i < 96000) square += samples[i] ** 2;
      }
      const echoes = [1, 2, 3].map(repeat => {
        const expectedFrame = 48000 + spacing * 48 * repeat;
        let frame = expectedFrame, value = 0, sum = 0;
        for (let i = expectedFrame - 2; i <= expectedFrame + 2; i++) {
          sum += Math.abs(samples[i]);
          if (Math.abs(samples[i]) > value) { frame = i; value = Math.abs(samples[i]); }
        }
        return { expectedFrame, frame, value, sum, expectedValue: .2 * .5 * .35 ** (repeat - 1) / 1.4725 };
      });
      const impulses = [];
      if (mode.startsWith('echo-')) for (let i = 48000; i < samples.length; i++) if (Math.abs(samples[i]) > 1e-5) impulses.push([i, samples[i]]);
      return { mode, impulses, peak, difference, stereoError, latePeak, rms: Math.sqrt(square / 48000), echoes };
    }, { mode, deck });
    assert.ok(result.peak <= (mode === 'sweep' ? .3 : .2) + 1e-6, JSON.stringify(result));
    assert.ok(result.stereoError < 1e-6);
    if (mode === 'dry') assert.ok(result.difference < 1e-6);
    if (mode.startsWith('echo-')) for (const echo of result.echoes) {
      assert.ok(Math.abs(echo.frame - echo.expectedFrame) <= 1, JSON.stringify(result));
      assert.ok(Math.abs(echo.sum - echo.expectedValue) < 1e-6, JSON.stringify(result));
    }
    if (mode === 'tone') assert.ok(result.rms < .001);
    if (['mute', 'reset', 'clear', 'clear-stop-fade'].includes(mode)) assert.ok(result.latePeak < 1e-6);
    evidence.push(result);
  }
  // Render the real shared piano through the same mixer for a playable dry/echo comparison.
  for (const echo of [0, .4]) {
    const pcm = await page.evaluate(async ({ echo, deck }) => {
      const { createMixer, updateToneEcho } = await import('./mixer.js');
      const module = await WebAssembly.compile(await (await fetch('./engine/djayvo_live.wasm')).arrayBuffer());
      const { exports: core } = await WebAssembly.instantiate(module);
      core._initialize(); core.djayvo_live_init(48000);
      const context = new OfflineAudioContext(2, 48000 * 6, 48000), mixer = createMixer(context);
      const channel = deck === null ? mixer.rack : mixer.channels[deck];
      const fx = deck === null ? mixer.rackFX : mixer.strips[deck].fx;
      channel.gain.value = .65;
      updateToneEcho(context, fx, 100, echo, 300);
      const buffer = context.createBuffer(2, 48000 * 6, 48000);
      const pointer = core.djayvo_live_buffer();
      for (let frame = 0; frame < buffer.length; frame += 128) {
        if (frame === 0) [60, 64, 67].forEach((pitch, i) => core.djayvo_live_note(i + 1, 0, pitch, 100));
        if (frame === 24064) [1, 2, 3].forEach(id => core.djayvo_live_off(id));
        if (frame === 96000) [62, 65, 69].forEach((pitch, i) => core.djayvo_live_note(i + 4, 0, pitch, 90));
        if (frame === 120064) [4, 5, 6].forEach(id => core.djayvo_live_off(id));
        const count = Math.min(128, buffer.length - frame);
        if (!core.djayvo_live_render(count)) throw new Error('Live render failed');
        const samples = new Float32Array(core.memory.buffer, pointer, count * 2);
        for (let channel = 0; channel < 2; channel++) for (let i = 0; i < count; i++) buffer.getChannelData(channel)[frame + i] = samples[i * 2 + channel];
      }
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(deck === null ? fx.input : mixer.strips[deck].input); source.start();
      const rendered = await context.startRendering();
      return Array.from({ length: rendered.length * 2 }, (_, i) => rendered.getChannelData(i % 2)[Math.floor(i / 2)]);
    }, { echo, deck });
    assert.ok(pcm.every(Number.isFinite));
    const peak = pcm.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    assert.ok(peak > .001 && peak < 1);
    const wav = Buffer.alloc(44 + pcm.length * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(192000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
    pcm.forEach((value, i) => wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2));
    const name = `${deck === null ? '' : `deck-${deck === 0 ? 'a' : 'b'}-`}piano-${echo ? 'echo' : 'dry'}.wav`;
    await fs.writeFile(path.join(output, name), wav);
    evidence.push({ file: name, peak, frames: pcm.length / 2, rate: 48000, noteOn: [0, 96000], noteOff: [24064, 120064] });
  }
  return evidence;
}
