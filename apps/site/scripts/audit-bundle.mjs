import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
let count = 0;
for (const path of await readdir('.next/static', { recursive: true })) {
  if (!(await stat(`.next/static/${path}`)).isFile()) continue;
  const bytes = await readFile(`.next/static/${path}`); count++;
  for (const name of ['BETTER_AUTH_SECRET', 'DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'DATABASE_MIGRATION_URL', 'RESEND_API_KEY','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','CLOUDFLARE_API_TOKEN','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','APPLE_PRIVATE_KEY','JAMLOOM_WORKER_SECRET','VASTAI_KEY']) {
    assert.ok(!process.env[name] || !bytes.includes(process.env[name]), `Server secret found in browser bundle: ${name}`);
  }
}
const source = new URL('../../../dist/web/', import.meta.url);
const publicRoot = new URL('../public/studio/', import.meta.url);
const sourceFiles = (await readdir(source, { recursive: true })).sort();
assert.deepEqual((await readdir(publicRoot, { recursive: true })).sort(), sourceFiles);
for (const path of sourceFiles) {
  if (!(await stat(new URL(path, source))).isFile()) continue;
  const before = await readFile(new URL(path, source));
  const after = await readFile(new URL(path, publicRoot));
  if (path === 'index.html') assert.equal(after.toString(), before.toString().replace('<a href="#mixes">Your mixes</a>', '<a href="/account">Account</a>'));
  else if (path !== 'service-worker.js') assert.ok(before.equals(after), `Studio asset changed: ${path}`);
}
execFileSync('python3', ['scripts/build_offline.py', fileURLToPath(publicRoot), '--check'], { cwd: fileURLToPath(new URL('../../../', import.meta.url)), stdio: 'pipe' });
console.log(JSON.stringify({ status: 'PASS', client_files_checked: count, server_secrets_absent: 'PASS',
  studio_assets_unchanged_except_account_link_and_offline_hashes: 'PASS',
  wasm_sha256: createHash('sha256').update(await readFile(new URL('engine/jamloom_web.wasm', publicRoot))).digest('hex'),
}, null, 2));
