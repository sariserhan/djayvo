'use client';

import { useState, type FormEvent } from 'react';
import { createAuthClient } from 'better-auth/react';

const auth = createAuthClient();
export type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | 'verify';
export function AccountForm({ mode, token }: { mode: Mode; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '');
    const password = String(fields.get('password') ?? '');
    setBusy(true); setError(''); setMessage('');
    try {
      const result = mode === 'sign-in' ? await auth.signIn.email({ email, password })
        : mode === 'sign-up' ? await auth.signUp.email({ email, password, name: String(fields.get('name')), callbackURL: '/account/sign-in' })
        : mode === 'forgot-password' ? await auth.requestPasswordReset({ email, redirectTo: '/account/reset-password' })
        : mode === 'verify' ? await auth.sendVerificationEmail({ email, callbackURL: '/account/sign-in' })
        : await auth.resetPassword({ token: token!, newPassword: password });
      if (result.error) {
        setError(result.error.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : mode === 'sign-in' ? 'Unable to sign in. Check your details and verify your email.'
          : mode === 'reset-password' ? 'This reset link may have expired. Request a new link.'
          : 'Unable to complete this request. Please try again.');
      } else if (mode === 'sign-in') {
        let destination='/account';
        try { if(sessionStorage.getItem('jamloom-save-selection'))destination='/library'; } catch {}
        window.location.assign(destination);
      } else {
        setMessage(mode === 'reset-password' ? 'Password updated. You can now sign in.'
          : 'Check your email. If this address is eligible, a link will arrive shortly.');
      }
    } catch { setError('Connection interrupted. Please try again.'); }
    finally { setBusy(false); }
  }
  const passwords = ['sign-in', 'sign-up', 'reset-password'].includes(mode);
  const label = { 'sign-in': 'Sign in', 'sign-up': 'Create account', 'forgot-password': 'Send reset link', 'reset-password': 'Update password', verify: 'Send verification link' }[mode];
  return <>
    <form className="account-form" onSubmit={submit}>
      {mode === 'sign-up' && <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>}
      {mode !== 'reset-password' && <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>}
      {passwords && <><label>Password<input type="password" name="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} aria-describedby={mode !== 'sign-in' ? 'password-hint' : undefined} required minLength={mode === 'sign-in' ? 1 : 12} maxLength={128} /></label>{mode !== 'sign-in' && <small id="password-hint" className="muted">Use at least 12 characters.</small>}</>}
      <button className="primary" disabled={busy || (mode === 'reset-password' && !token)}>{busy ? 'Please wait…' : label}</button>
    </form>
    {error && <p role="alert" className="account-error">{error}</p>}
    {message && <p role="status" className="account-message">{message}</p>}
  </>;
}

export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <><button className="secondary" disabled={busy} onClick={async () => {
    setBusy(true); setError(false);
    try {
      const result = await auth.signOut();
      if (result.error) throw new Error('Sign out failed');
      window.location.assign('/account/sign-in');
    } catch { setError(true); setBusy(false); }
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>
  {error && <p role="alert">Could not sign out. Please try again.</p>}</>;
}
