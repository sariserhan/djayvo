import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
// Audit the explicit public bundle before copying; never expose the repository.
execFileSync('python3', ['scripts/verify_web_bundle.py'], { cwd: root, stdio: 'pipe' });
const target = new URL('../public/studio/', import.meta.url);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(new URL('../../../dist/web/', import.meta.url), target, { recursive: true });
const index = new URL('index.html', target);
const html = await readFile(index, 'utf8');
const original = '<a href="#mixes">Your mixes</a>';
if (!html.includes(original)) throw new Error('Studio navigation changed; review the integration.');
await writeFile(index, html.replace(original, '<a href="/account">Account</a>'));
console.log('Prepared the audited browser studio and engine.');
