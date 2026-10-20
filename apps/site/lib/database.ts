import { Pool, types } from 'pg';

export function createPool(connectionString: string) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // URL SSL flags must not override certificate verification in pg.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl']) url.searchParams.delete(key);
  const pool = new Pool({
    connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true },
    max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000,
    statement_timeout: 10_000, application_name: 'jamloom',
    // Better Auth normalizes bigint timestamps, but string timestamps break retry arithmetic.
    types: { getTypeParser: (oid, format) => oid === types.builtins.INT8 && format !== 'binary'
      ? BigInt : types.getTypeParser(oid, format) },
  });
  pool.on('error', () => console.error('Database connection interrupted.'));
  return pool;
}
