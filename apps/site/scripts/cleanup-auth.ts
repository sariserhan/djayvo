import './env';
import { readConfig } from '../lib/config';
import { createPool } from '../lib/database';
import { cleanupAuth } from '../lib/auth-cleanup';

const config=readConfig(),url=new URL(config.databaseURL),target=`${url.host}${url.pathname}`;
if (!process.argv.includes('--apply') || process.env.DJAYVO_CLEANUP_TARGET!==target) {
  console.log(`Review target: ${target}. Set DJAYVO_CLEANUP_TARGET to that value and pass --apply to remove expired sessions and verification records.`);
} else {
  const pool=createPool(config.databaseURL);
  try {console.log(JSON.stringify(await cleanupAuth(pool)));}
  finally {await pool.end();}
}
