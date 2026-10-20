import type { BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import type { Pool } from 'pg';
import type { Config } from './config';
import { sendEmail, type AccountEmail } from './email';

export function authOptions(config: Config, database: Pool, background?: (task: Promise<unknown>) => void): BetterAuthOptions {
  const deliver = (message: AccountEmail) => {
    const task = sendEmail(config, message);
    if (background) { background(task); return Promise.resolve(); }
    return task;
  };
  return {
    appName: 'Jamloom', database, baseURL: config.baseURL, secret: config.secret,
    trustedOrigins: [config.baseURL],
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 12,
      maxPasswordLength: 128, revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => deliver({
        to: user.email, subject: 'Reset your Jamloom password',
        text: 'Choose a new password to get back to your music.\n\nIf you did not request this, ignore this email. Your password will stay unchanged.',
        action: { label: 'Reset password', url },
      }),
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: false,
      sendVerificationEmail: ({ user, url }) => deliver({
        to: user.email, subject: 'Verify your Jamloom email',
        text: 'Confirm your email to finish setting up your Jamloom account.\n\nYour recordings stay on your device unless you explicitly save them online. If you did not create this account, ignore this email.',
        action: { label: 'Verify email', url },
      }),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    databaseHooks: { user: { create: { before: async user => {
      if (!user.name.trim() || user.name.length > 80 || user.email.length > 254 || user.image) {
        throw new APIError('BAD_REQUEST', { message: 'Invalid account details.' });
      }
      return { data: { ...user, name: user.name.trim() } };
    } }, update: { before: async user => {
      if ((user.name !== undefined && (!user.name.trim() || user.name.length > 80)) || user.image) {
        throw new APIError('BAD_REQUEST', { message: 'Invalid account details.' });
      }
      return { data: user };
    } } } },
    rateLimit: {
      enabled: true, storage: 'database', window: 60, max: 60,
      customRules: {
        '/sign-up/email': { window: 60, max: 3 },
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: ['x-real-ip'] } },
  };
}
