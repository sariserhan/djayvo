import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
// Generated files are ignored: compile current sources even on a fresh checkout.
execFileSync('sh', ['scripts/web_build.sh'], { cwd: root, stdio: 'inherit' });
// Audit the explicit public bundle before copying; never expose the repository.
execFileSync('python3', ['scripts/verify_web_bundle.py'], { cwd: root, stdio: 'inherit' });
const target = new URL('../public/studio/', import.meta.url);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(new URL('../../../dist/web/', import.meta.url), target, { recursive: true });
const index = new URL('index.html', target);
const html = await readFile(index, 'utf8');
const original = '<a href="#mixes">Your mixes</a>';
if (!html.includes(original)) throw new Error('Studio navigation changed; review the integration.');
await writeFile(index, html.replace(original, '<a href="/account">Account</a>'));
const deck = new URL('dj.html', target);
await writeFile(deck, (await readFile(deck, 'utf8')).replace('Save the app in Voice studio → Privacy &amp; credits for offline preparation', 'Open <a href="/pro">your Pro account</a> → Use the web studio offline to prepare offline access'));
execFileSync('python3', ['scripts/build_offline.py', fileURLToPath(target)], { cwd: root, stdio: 'pipe' });
console.log('Prepared the audited browser studio and engine.');
