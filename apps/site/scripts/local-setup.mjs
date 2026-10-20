import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const app = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(join(app, '.env.local'))) throw new Error('.env.local already exists; refusing to replace it.');
const root = fileURLToPath(new URL('../../../build-site/', import.meta.url));
mkdirSync(root, { recursive: true, mode: 0o700 });
const run = mkdtempSync(join(root, 'local-'));
const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
const password = randomBytes(24).toString('hex');
const passfile = join(run, 'init-password');
writeFileSync(passfile, password, { mode: 0o600 });
const data = join(run, 'data');
execFileSync(join(bin, 'initdb'), ['-D', data, '-U', 'jamloom', '--auth=scram-sha-256', `--pwfile=${passfile}`], { stdio: 'pipe' });
unlinkSync(passfile);
appendFileSync(join(data, 'postgresql.conf'), `\nlisten_addresses = '127.0.0.1'\nport = 55439\nunix_socket_directories = '${run.replaceAll("'", "''")}'\n`);
execFileSync(join(bin, 'pg_ctl'), ['-D', data, '-l', join(run, 'postgres.log'), '-w', 'start'], { stdio: 'pipe' });
execFileSync(join(bin, 'createdb'), ['-h', '127.0.0.1', '-p', '55439', '-U', 'jamloom', 'jamloom_local'], { env: { ...process.env, PGPASSWORD: password }, stdio: 'pipe' });
const url = `postgresql://jamloom:${password}@127.0.0.1:55439/jamloom_local`;
writeFileSync(join(app, '.env.local'), [
  `DATABASE_URL=${url}`, `DATABASE_MIGRATION_URL=${url}`,
  'BETTER_AUTH_URL=http://localhost:3000', `BETTER_AUTH_SECRET=${randomBytes(48).toString('hex')}`,
  `JAMLOOM_LOCAL_OUTBOX=${join(run, 'outbox')}`, '',
].join('\n'), { mode: 0o600, flag: 'wx' });
writeFileSync(join(root, 'local-postgres.json'), JSON.stringify({ bin, data, run }), { mode: 0o600 });
console.log('Created an isolated loopback Postgres cluster and private .env.local. No emails leave this Mac.');
console.log('Stop it using pg_ctl -D <data path in build-site/local-postgres.json> stop.');
