import type { Pool } from 'pg';

export async function cleanupAuth(pool: Pool) {
  const result: Record<string, number> = {};
  // Keep account identities and credentials; only expired bearer records are disposable.
  for (const table of ['session', 'verification'] as const) {
    const deleted = await pool.query(`WITH expired AS (
      SELECT id FROM "${table}" WHERE "expiresAt" < now()
      ORDER BY "expiresAt", id LIMIT 500 FOR UPDATE SKIP LOCKED
    ) DELETE FROM "${table}" t USING expired e WHERE t.id=e.id`);
    result[table] = deleted.rowCount ?? 0;
  }
  return result;
}
