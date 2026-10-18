import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import type { Pool } from 'pg';

export async function migrate(pool: Pool, directory = new URL('../migrations/', import.meta.url)) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(90418273)');
    await client.query('CREATE TABLE IF NOT EXISTS djayvo_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = new Map((await client.query('SELECT name, sha256 FROM djayvo_migrations')).rows.map(row => [row.name, row.sha256]));
    const files = (await readdir(directory)).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort();
    if ([...applied.keys()].some(name => !files.includes(name))) throw new Error('An applied migration is missing.');
    const completed: string[] = [];
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      if (applied.has(name)) {
        if (applied.get(name) !== hash) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO djayvo_migrations (name, sha256) VALUES ($1, $2)', [name, hash]);
      completed.push(name);
    }
    await client.query('COMMIT');
    return completed;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
