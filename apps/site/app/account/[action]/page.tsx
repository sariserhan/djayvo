import { notFound } from 'next/navigation';
import { accountsConfigured } from '../../../lib/services';
import { AccountForm, type Mode } from '../form';

export const dynamic = 'force-dynamic';
const titles: Record<Mode, string> = {
  'sign-in': 'Welcome back.', 'sign-up': 'Make yourself at home.',
  'forgot-password': 'Forgot your password?', 'reset-password': 'A fresh password.', verify: 'Verify your email.',
};
export default async function AccountAction({ params, searchParams }: {
  params: Promise<{ action: string }>; searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { action } = await params;
  if (!Object.hasOwn(titles, action)) notFound();
  const mode = action as Mode;
  const query = await searchParams;
  const token = typeof query.token === 'string' && query.token.length <= 512 ? query.token : undefined;
  return <section className="account-panel"><p className="eyebrow">Your Jamloom account</p><h1>{titles[mode]}</h1>
    <p>Your local mixes stay on this device. Signing in does not upload or publish them.</p>
    {query.error && <p role="alert" className="account-error">This link is invalid or expired. Request a new one below.</p>}
    {accountsConfigured() ? <AccountForm mode={mode} token={token} />
      : <p role="status">Accounts are not available yet. You can still make music in the studio.</p>}
    {mode === 'reset-password' && !token && <p role="alert">Open the link in your reset email, or request another.</p>}
    <div className="account-links">
      {mode !== 'sign-in' && <a href="/account/sign-in">Sign in</a>}
      {mode !== 'sign-up' && <a href="/account/sign-up">Create account</a>}
      {mode !== 'forgot-password' && <a href="/account/forgot-password">Forgot password?</a>}
      {mode === 'sign-in' && <a href="/account/verify">Resend verification email</a>}
      <a href="/">Back to the studio</a>
    </div>
  </section>;
}
