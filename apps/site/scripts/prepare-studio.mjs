import { execFileSync } from 'node:child_process';
import { studioSiteShell } from './studio-site-shell.mjs';
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
for (const name of ['index.html', 'dj.html']) {
  const page = new URL(name, target);
  await writeFile(page, studioSiteShell(await readFile(page, 'utf8')));
}
execFileSync('python3', ['scripts/build_offline.py', fileURLToPath(target)], { cwd: root, stdio: 'pipe' });
console.log('Prepared the audited browser studio and engine.');
