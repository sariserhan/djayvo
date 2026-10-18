import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { accountsConfigured, services } from '../../lib/services';
import { listTracks, parseCursor } from '../../lib/library';

export const dynamic = 'force-dynamic';
export default async function Library({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  if (!accountsConfigured()) redirect('/account/sign-in');
  const { auth, pool } = services();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect('/account/sign-in');
  const { cursor } = await searchParams;
  try { if (cursor && typeof cursor !== 'string') notFound(); parseCursor(cursor); } catch { notFound(); }
  const { tracks, nextCursor } = await listTracks(pool, session.user.id, cursor);
  return <section><h1>Your cloud library.</h1>
    <p className="library-note">Only you can see these tracks. Cloud saving is not available yet. Your existing mixes are still in this browser’s studio.</p>
    {tracks.length ? <ul className="library-list">{tracks.map(track => <li key={track.id}><strong>{track.title}</strong><p className="muted">{track.strategy} · {(track.duration_ms / 1000).toFixed(0)} seconds</p></li>)}</ul>
      : <div className="empty"><p>No cloud-saved tracks yet.</p><a href="/" className="primary">Make music</a></div>}
    {nextCursor && <a href={`/library?cursor=${encodeURIComponent(nextCursor)}`}>Older tracks</a>}
  </section>;
}
