import './env';
import { createPool } from '../lib/database';
const pool = createPool(process.env.DATABASE_URL!);
try {
  const { rows } = await pool.query(`SELECT pg_database_size(current_database())::text AS database_bytes,
    (SELECT count(*)::text FROM "user") AS users,
    (SELECT count(*)::text FROM tracks WHERE deleted_at IS NULL) AS tracks,
    (SELECT count(*)::text FROM session) AS sessions`);
  console.log(JSON.stringify({ ...rows[0], compute_and_transfer: 'Check the Neon console; not measured by SQL.' }, null, 2));
} finally { await pool.end(); }
