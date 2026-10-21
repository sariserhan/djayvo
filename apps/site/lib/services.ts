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
import {isAdmin} from './admin-access';

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
  const catalogue=audio && (config.local || (process.env.JAMLOOM_CATALOGUE_ENABLED ?? process.env.DJAYVO_CATALOGUE_ENABLED)==='true') ? new Catalogue(pool,audio) : null;
  // Recheck suspension for every protected application read, including sessions racing revocation.
  const guardedAuth={...auth,api:{...auth.api,getSession:async (input:{headers:Headers})=>{
    const session=await auth.api.getSession(input);
    if(session&&(await pool.query('SELECT suspended FROM "user" WHERE id=$1',[session.user.id])).rows[0]?.suspended)return null;
    return session;
  }}};
  return { pool, auth:guardedAuth, config, audio, catalogue };
}
const globalServices = globalThis as typeof globalThis & { jamloomServices?: ReturnType<typeof createServices> };
export function services() {
  return globalServices.jamloomServices ??= createServices();
}
export function accountsConfigured() {
  try { readConfig(); return true; } catch { return false; }
}
export function isReviewer(user:{email:string;emailVerified:boolean}|undefined) {
  return isAdmin(user) || !!user?.emailVerified && ((process.env.JAMLOOM_REVIEWER_EMAILS ?? process.env.DJAYVO_REVIEWER_EMAILS)??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());
}
