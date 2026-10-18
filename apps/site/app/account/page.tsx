import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { accountsConfigured, services } from '../../lib/services';
import { SignOut } from './form';

export const dynamic = 'force-dynamic';
export default async function Account() {
  if (!accountsConfigured()) redirect('/account/sign-in');
  const session = await services().auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect('/account/sign-in');
  return <section className="account-panel"><h1>Your account.</h1>
    <p>Signed in as {session.user.email}</p>
    <p>Your recordings and browser mixes remain on this device. Cloud saving and catalogue submissions are coming next.</p>
    <div className="account-links"><a href="/">Make music</a><a href="/library">Cloud library</a></div>
    <hr /><SignOut />
  </section>;
}
