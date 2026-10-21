import {isAdmin} from '../../lib/admin-access';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { accountsConfigured, services, isReviewer } from '../../lib/services';
import { SignOut } from './form';

export const dynamic = 'force-dynamic';
export default async function Account() {
  if (!accountsConfigured()) redirect('/account/sign-in');
  const session = await services().auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect('/account/sign-in');
  return <section className="account-panel"><h1>Your account.</h1>
    <p>Signed in as {session.user.email}</p>
    <p>Your recordings and browser mixes remain on this device. Choose a finished mix in the cloud library to save privately or submit separately for catalogue review.</p>
    <div className="account-links"><a href="/improvise">Make music</a><a href="/library">Cloud library</a><a href="/account/credits">Credits</a><a href="/account/purchases">Purchases</a><a href="/account/generations">Generations</a></div>
    {isAdmin(session.user)&&<p><a href="/admin">Admin dashboard</a></p>}
    {isReviewer(session.user)&&<p><a href="/review">Catalogue review</a></p>}
    <hr /><SignOut />
  </section>;
}
