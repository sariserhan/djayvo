import type { Pool } from 'pg';

export function parseCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    if (cursor.length > 256) throw new Error();
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (typeof value.date !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.date) ||
      !Number.isFinite(Date.parse(value.date)) || typeof value.id !== 'string' ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value.id)) throw new Error();
    return value as { date: string; id: string };
  } catch { throw new Error('Invalid page cursor.'); }
}
export async function listTracks(pool: Pool, ownerId: string, cursor?: string) {
  const before = parseCursor(cursor);
  const result = await pool.query<{
    id: string; title: string; strategy: string; duration_ms: number; created_at: Date;
  }>(`SELECT id, title, strategy, duration_ms, created_at FROM tracks
      WHERE owner_id = $1 AND deleted_at IS NULL
      AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
      ORDER BY created_at DESC, id DESC LIMIT 51`, [ownerId, before?.date ?? null, before?.id ?? null]);
  const tracks = result.rows.slice(0, 50);
  const last = tracks.at(-1);
  const nextCursor = result.rows.length > 50 && last
    ? Buffer.from(JSON.stringify({ date: last.created_at.toISOString(), id: last.id })).toString('base64url') : null;
  return { tracks, nextCursor };
}
