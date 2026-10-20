export const PATCHES = [
  ['Grand piano', 0], ['Talk bass', 11], ['Electric piano', 1], ['Electric bass', 2], ['Synth bass', 3],
  ['Electric guitar', 4], ['Muted guitar', 5], ['Drawbar organ', 6], ['Warm pad', 7], ['Triangle lead', 8],
];
export const DRUMS = [['Kick', 36], ['Snare', 38], ['Closed hat', 42], ['Open hat', 46]];
export const PERCUSSION = [['Clap', 39], ['Rimshot', 37], ['Low tom', 41], ['Shaker', 70]];
export const noteName = note => `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][note % 12]}${Math.floor(note / 12) - 1}`;
export const playable = (patch, pitch) => Number.isInteger(pitch) && pitch >= 21 && pitch <= 108 && (!(patch === 4 || patch === 5) || (pitch >= 40 && pitch <= 79));

export async function createRack(context, destination) {
  if (!context.audioWorklet) throw new Error('Live instruments need AudioWorklet on HTTPS or localhost.');
  const response = await fetch(new URL('./engine/jamloom_live.wasm', import.meta.url), { credentials: 'omit' });
  if (!response.ok) throw new Error('Could not load the instrument bank. Prepare the studio while online.');
  const module = await WebAssembly.compile(await response.arrayBuffer());
  await context.audioWorklet.addModule(new URL('./instrument-worklet.js', import.meta.url));
  const node = new AudioWorkletNode(context, 'jamloom-instruments', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { module },
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Instrument preparation timed out. Reload to retry.')), 15000);
      const failed = () => { clearTimeout(timer); reject(new Error('The instrument engine could not start.')); };
      node.addEventListener('processorerror', failed, { once: true });
      node.port.onmessage = ({ data }) => { if (data.type === 'ready') { clearTimeout(timer); node.removeEventListener('processorerror', failed); resolve(); } };
    });
    node.connect(destination);
    return node;
  } catch (error) { node.port.close(); node.disconnect(); throw error; }
}
