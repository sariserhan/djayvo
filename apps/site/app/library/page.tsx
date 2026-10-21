import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { accountsConfigured, services } from '../../lib/services';
import { listTracks, parseCursor } from '../../lib/library';
import { SaveMix, TrackControls } from './controls';
import { SubmitTrack, Withdraw } from '../catalogue/controls';

export const dynamic = 'force-dynamic';
export default async function Library({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  if (!accountsConfigured()) redirect('/account/sign-in');
  const { auth, pool, audio, catalogue } = services();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect('/account/sign-in');
  const { cursor } = await searchParams;
  try { if (cursor && typeof cursor !== 'string') notFound(); parseCursor(cursor); } catch { notFound(); }
  const { tracks, nextCursor } = await listTracks(pool, session.user.id, cursor);
  const submissions=catalogue?await catalogue.submissions(session.user.id):[];
  return <section><h1>Your cloud library.</h1>
    <p className="library-note">New saves default to public with explicit sharing permission and review. Choose private to keep a mix out of the catalogue and homepage. Existing private saves stay private. Your existing local mixes stay in this browser’s studio. {audio?.store.local ? 'This development site stores account audio on this Mac.' : !audio ? 'Account audio saving is not configured yet.' : ''}</p>
    {audio && <SaveMix publicSharing={!!catalogue}/>}
    {tracks.length ? <ul className="library-list">{tracks.map(track => <li key={track.id}><strong>{track.title}</strong><p className="muted">{track.strategy} · {(track.duration_ms / 1000).toFixed(0)} seconds</p>{track.playable && audio && <><TrackControls id={track.id} title={track.title}/>{catalogue&&<SubmitTrack id={track.id}/>}</>}</li>)}</ul>
      : <div className="empty"><p>No cloud-saved tracks yet.</p><a href="/" className="primary">Make music</a></div>}
    {nextCursor && <a href={`/library?cursor=${encodeURIComponent(nextCursor)}`}>Older tracks</a>}
    {!!submissions.length&&<section><h2>Your catalogue submissions</h2>{submissions.map(row=><div key={row.id}><strong>{row.title}</strong><p>Status: {row.state}</p>{row.review_note&&<p>Review note: {row.review_note}</p>}{row.state!=='withdrawn'&&<Withdraw id={row.id}/>}</div>)}</section>}
    {audio && <p className="library-note">Removing a mix hides it immediately. Stored files are removed by the cleanup job after upload links expire. Previously issued playback links can remain valid for up to one minute; downloaded copies cannot be recalled.</p>}
  </section>;
}
