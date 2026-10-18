import createEngine from './engine/djayvo_web.mjs';

self.onmessage = async ({ data }) => {
  try {
    if (data.consent !== true || !(data.wav instanceof ArrayBuffer) || data.wav.byteLength > 1000000
      || !Number.isInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff
      || !['three', 'club'].includes(data.style)) throw new Error('Invalid recording or permission.');
    const engine = await createEngine();
    engine.FS.writeFile('/input.wav', new Uint8Array(data.wav));
    self.postMessage({ type: 'rendering' });
    const error = engine.ccall('djayvo_web_render', 'string', ['number', 'number', 'number'],
      [data.seed, data.style === 'club' ? 1 : 0, 1]);
    if (error) throw new Error(error);
    const files = [];
    for (const style of data.style === 'club' ? ['club'] : ['hiphop', 'reggae', 'experimental']) {
      for (const ext of ['wav', 'score.json', 'report.json', 'events.tsv']) {
        const name = `${style}.${ext}`;
        const bytes = engine.FS.readFile(`/mix.${name}`);
        const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          n => n.toString(16).padStart(2, '0')).join('');
        files.push({ name, bytes, sha256 });
      }
    }
    self.postMessage({ type: 'complete', files }, files.map(file => file.bytes.buffer));
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Unable to make music. Please try again.' });
  } finally { self.close(); }
};
