import 'server-only';
import { betterAuth } from 'better-auth';
import { after } from 'next/server';
import { readConfig } from './config';
import { createPool } from './database';
import { authOptions } from './auth-options';

function createServices() {
  const config = readConfig();
  const pool = createPool(config.databaseURL);
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
  return { pool, auth };
}
const globalServices = globalThis as typeof globalThis & { djayvoServices?: ReturnType<typeof createServices> };
export function services() {
  return globalServices.djayvoServices ??= createServices();
}
export function accountsConfigured() {
  try { readConfig(); return true; } catch { return false; }
}
