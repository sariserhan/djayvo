import './env';
import { readConfig } from '../lib/config';
import { createPool } from '../lib/database';
import { audioStore } from '../lib/audio-store';
import { PrivateAudio } from '../lib/private-audio';

const config=readConfig(), target=new URL(config.databaseURL);
const identity=`${target.host}${target.pathname}`;
if (!process.argv.includes('--apply') || (process.env.JAMLOOM_CLEANUP_TARGET ?? process.env.DJAYVO_CLEANUP_TARGET)!==identity) {
  console.log(`Review target: ${identity}. Set JAMLOOM_CLEANUP_TARGET to that value and pass --apply to remove expired private audio.`);
} else {
  const store=audioStore(config);
  if (!store) throw new Error('Audio storage is not configured.');
  const pool=createPool(config.databaseURL);
  try {
    const result=await new PrivateAudio(pool,store).cleanup();
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode=1;
  } finally { await pool.end(); }
}
