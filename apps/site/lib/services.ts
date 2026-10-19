import 'server-only';
import { betterAuth } from 'better-auth';
import { after } from 'next/server';
import { attachDatabasePool } from '@vercel/functions';
import { readConfig } from './config';
import { createPool } from './database';
import { authOptions } from './auth-options';
import { audioStore } from './audio-store';
import { PrivateAudio } from './private-audio';
import { Catalogue } from './catalogue';

function createServices() {
  const config = readConfig();
  const pool = createPool(config.databaseURL);
  if (process.env.VERCEL) attachDatabasePool(pool);
  const background = (task: Promise<unknown>) => {
    // Attach rejection handling immediately, before the response finishes.
    const safe = task.catch(() => console.error('Account background task failed; check email delivery configuration.'));
    after(async () => { await safe; });
  };
  const options = authOptions(config, pool, background);
  const auth = betterAuth({ ...options, advanced: {
    ...options.advanced,
    backgroundTasks: { handler: background },
  } });
  const store=audioStore(config);
  const audio=store ? new PrivateAudio(pool,store) : null;
  const catalogue=audio && (config.local || process.env.DJAYVO_CATALOGUE_ENABLED==='true') ? new Catalogue(pool,audio) : null;
  return { pool, auth, config, audio, catalogue };
}
const globalServices = globalThis as typeof globalThis & { djayvoServices?: ReturnType<typeof createServices> };
export function services() {
  return globalServices.djayvoServices ??= createServices();
}
export function accountsConfigured() {
  try { readConfig(); return true; } catch { return false; }
}
export function isReviewer(user:{email:string;emailVerified:boolean}|undefined) {
  return !!user?.emailVerified && (process.env.DJAYVO_REVIEWER_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());
}
