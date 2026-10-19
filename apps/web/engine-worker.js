import { selectFresh } from './novelty.js';
import createEngine from './engine/djayvo_web.mjs';

self.onmessage = async ({ data }) => {
  try {
    if (data.consent !== true || !(data.wav instanceof ArrayBuffer) || data.wav.byteLength > 1000000
      || !Number.isInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff
      || !['three', 'club', 'funk', 'call_response', 'hybrid'].includes(data.style)) throw new Error('Invalid recording or permission.');
    if (data.context && (data.style !== 'call_response' ||
      !Number.isInteger(data.context.tempo) || data.context.tempo < 60000 || data.context.tempo > 180000 ||
      !Number.isInteger(data.context.tonic) || data.context.tonic < 60 || data.context.tonic > 71 ||
      ![undefined, 'minor', 'major'].includes(data.context.mode)))
      throw new Error('Invalid session context. Confirm tempo, tonic and major/minor mode.');
    const engine = await createEngine();
    engine.FS.writeFile('/input.wav', new Uint8Array(data.wav));
    self.postMessage({ type: 'rendering' });
    const styles = data.style === 'three' ? ['hiphop', 'reggae', 'experimental'] : [data.style];
    const selection = await selectFresh(data.seed, data.recent ?? [], async seed => {
      const error = data.context ? engine.ccall('djayvo_web_session_mode', 'string', ['number', 'number', 'number', 'number', 'number'],
        [seed, data.context.tempo, data.context.tonic, data.context.mode === 'major' ? 1 : 0, 1]) : engine.ccall('djayvo_web_render', 'string', ['number', 'number', 'number'],
        [seed, ['three', 'club', 'funk', 'call_response', 'hybrid'].indexOf(data.style), 1]);
      if (error) throw new Error(error);
      return styles.map(style => JSON.parse(engine.FS.readFile(`/mix.${style}.score.json`, { encoding: 'utf8' })));
    });
    const files = [];
    for (const style of styles) {
      for (const ext of ['wav', 'score.json', 'report.json', 'events.tsv']) {
        const name = `${style}.${ext}`;
        const bytes = engine.FS.readFile(`/mix.${name}`);
        const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          n => n.toString(16).padStart(2, '0')).join('');
        files.push({ name, bytes, sha256 });
      }
    }
    self.postMessage({ type: 'complete', files, ...selection }, files.map(file => file.bytes.buffer));
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Unable to make music. Please try again.' });
  } finally { self.close(); }
};
