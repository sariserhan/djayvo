import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createRequire} from 'node:module';
const {chromium,webkit}=createRequire(process.cwd()+'/apps/web/package.json')('playwright');

const root = fileURLToPath(new URL('../../../', import.meta.url));
const kind = process.env.DJAYVO_BROWSER || 'chromium';
const output = await fs.mkdtemp(path.join(root, `renders/web-${kind}-transient-`));
const browser = await (kind === 'webkit' ? webkit : chromium).launch();
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:4173');
  await page.exposeFunction('writeArtifact', async (name, base64) => {
    if (!/^(hiphop|reggae|experimental|club|funk|call_response|hybrid)\.(wav|score\.json|report\.json|events\.tsv)$/.test(name)) throw new Error('Unexpected artifact');
    await fs.writeFile(path.join(output, `mix.${name}`), Buffer.from(base64, 'base64'));
  });
  const bytes = Array.from(await fs.readFile(path.join(root, 'renders/licensed-nonspeech-20261018/noise.wav')));
  const results = await page.evaluate(async input => {
    const results = [];
    for (const style of ['three', 'club', 'funk', 'call_response', 'hybrid']) {
      const started = performance.now();
      await new Promise((resolve, reject) => {
        const worker = new Worker('./engine-worker.js', { type: 'module' });
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('Timed out')); }, 90000);
        worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('Worker failed')); };
        worker.onmessage = async ({ data }) => {
          if (data.type === 'rendering') return;
          clearTimeout(timer); worker.terminate();
          if (data.type !== 'complete') { reject(new Error(data.message)); return; }
          try {
            results.push({ style, seconds: (performance.now() - started) / 1000, artifacts: data.files.length });
            for (const file of data.files) {
              const base64 = await new Promise(done => { const reader = new FileReader(); reader.onload = () => done(reader.result.split(',')[1]); reader.readAsDataURL(new Blob([file.bytes])); });
              await window.writeArtifact(file.name, base64);
            }
            resolve();
          } catch (error) { reject(error); }
        };
        worker.postMessage({ wav: new Uint8Array(input).buffer, consent: true, style, seed: 4123 });
      });
    }
    return results;
  }, bytes);
  await fs.writeFile(path.join(output, 'timings.json'), JSON.stringify({ browser: kind, version: browser.version(), results }, null, 2) + '\n');
  console.log('PASS:', kind, output, results);
} finally { await browser.close(); }
