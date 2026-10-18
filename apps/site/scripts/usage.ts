import './env';
import { createPool } from '../lib/database';
const pool = createPool(process.env.DATABASE_URL!);
try {
  const { rows } = await pool.query(`SELECT pg_database_size(current_database())::text AS database_bytes,
    (SELECT count(*)::text FROM "user") AS users,
    (SELECT count(*)::text FROM tracks WHERE deleted_at IS NULL) AS tracks,
    (SELECT count(*)::text FROM session) AS sessions,
    (SELECT count(*)::text FROM session WHERE "expiresAt" < now()) AS expired_sessions,
    (SELECT count(*)::text FROM verification WHERE "expiresAt" < now()) AS expired_verifications,
    (SELECT count(*)::text FROM "rateLimit") AS rate_limit_records,
    (SELECT count(*)::text FROM track_assets WHERE state='deleting') AS pending_audio_deletions,
    (SELECT count(*)::text FROM catalogue_submissions WHERE state='submitted') AS pending_reviews`);
  console.log(JSON.stringify({ ...rows[0], compute_and_transfer: 'Check the Neon console; not measured by SQL.' }, null, 2));
} finally { await pool.end(); }
