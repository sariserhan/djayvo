import './env';
import { createPool } from '../lib/database';
import { migrate } from '../lib/migrations';

const url = new URL(process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || '');
const target = `${url.host}${url.pathname}`;
if (!process.argv.includes('--apply')) {
  console.log(`Migration target: ${target}. To apply reviewed SQL, set JAMLOOM_MIGRATION_TARGET to this value and pass --apply.`);
} else {
  if ((process.env.JAMLOOM_MIGRATION_TARGET ?? process.env.DJAYVO_MIGRATION_TARGET) !== target) throw new Error('Migration target confirmation does not match.');
  if (url.hostname.includes('-pooler.')) throw new Error('Use the direct migration connection.');
  const pool = createPool(url.toString());
  try { console.log({ applied: await migrate(pool) }); } finally { await pool.end(); }
}
