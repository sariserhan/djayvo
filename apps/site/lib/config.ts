export function readConfig(env: Record<string, string | undefined> = process.env) {
  const required = ['DATABASE_URL', 'BETTER_AUTH_URL', 'BETTER_AUTH_SECRET'] as const;
  if (required.some(key => !env[key])) throw new Error('Account configuration is incomplete.');
  const database = new URL(env.DATABASE_URL!);
  const origin = new URL(env.BETTER_AUTH_URL!);
  const localHost = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  const localApp = localHost(origin.hostname) && !env.VERCEL;
  const local = localHost(database.hostname) && localApp;
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('Postgres URL required.');
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
      !['http:', 'https:'].includes(origin.protocol) || (!localApp && origin.protocol !== 'https:')) {
    throw new Error('An explicit HTTPS application origin is required outside local development.');
  }
  if (env.BETTER_AUTH_SECRET!.length < 32) throw new Error('Auth secret must contain at least 32 characters.');
  if (!local && !database.hostname.endsWith('.neon.tech')) throw new Error('Hosted database must use Neon.');
  const outbox = env.DJAYVO_LOCAL_OUTBOX;
  if (outbox && !localApp) throw new Error('The local email outbox is forbidden on hosted environments.');
  if (!outbox && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) throw new Error('Resend is not configured.');
  if (env.EMAIL_FROM && /[\r\n]/.test(env.EMAIL_FROM)) throw new Error('Invalid sender.');
  return {
    databaseURL: database.toString(), baseURL: origin.origin,
    secret: env.BETTER_AUTH_SECRET!, local, localApp, outbox,
    resendKey: env.RESEND_API_KEY, emailFrom: env.EMAIL_FROM,
  };
}

export type Config = ReturnType<typeof readConfig>;
