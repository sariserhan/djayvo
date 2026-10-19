import assert from 'node:assert/strict';
export async function verifySessionAudio(page) {
  const result = await page.evaluate(async () => {
    const { SessionTransport } = await import('/session-transport.js');
    const wasm = (await WebAssembly.instantiate(await (await fetch('/engine/djayvo_live.wasm')).arrayBuffer(), {})).instance.exports;
    wasm._initialize();
    const rate = 48000, context = new OfflineAudioContext(2, rate * 4, rate);
    const merger = context.createChannelMerger(2); merger.connect(context.destination);
    const a = context.createGain(), c = context.createGain(); a.connect(merger, 0, 0); c.connect(merger, 0, 1);
    const backing = context.createBuffer(1, rate * 3, rate), phrase = context.createBuffer(1, rate / 4, rate);
    backing.getChannelData(0).fill(.1); phrase.getChannelData(0).fill(.2);
    const transport = new SessionTransport(context, wasm.djayvo_next_bar);
    const startA = transport.startA(backing, a, 120000, 0);
    const startC = transport.arm(phrase, c);
    const rendered = await context.startRendering();
    let firstA = -1, firstC = -1, gap = 0;
    for (let i = 0; i < rendered.length; i++) {
      const left = rendered.getChannelData(0)[i], right = rendered.getChannelData(1)[i];
      if (Math.abs(left) > 1e-7 && firstA < 0) firstA = i;
      if (Math.abs(right) > 1e-7 && firstC < 0) firstC = i;
      if (i >= startC && i < startC + phrase.length && Math.abs(left - .1) > 1e-6) gap++;
    }
    const frames = [];
    for (const sr of [44100, 48000, 96000]) for (const tempo of [60000, 83920, 127190, 180000]) {
      for (let bar = 0; bar < 10000; bar += 13) {
        const expected = 17 + Math.floor((bar * 240000 * sr + tempo / 2) / tempo);
        if (wasm.djayvo_next_bar(expected, 17, sr, tempo) !== expected) throw new Error('Absolute grid mismatch');
      }
      frames.push({ rate: sr, tempo, afterSixHours: wasm.djayvo_next_bar(sr * 21600, 17, sr, tempo) });
    }
    return { startA, startC, firstA, firstC, gap, frames, sampleRate: rate, renderedFrames: rendered.length };
  });
  assert.equal(result.firstA, result.startA + 1);
  assert.equal(result.firstC, result.startC + 1);
  assert.equal(result.gap, 0);
  return result;
}
