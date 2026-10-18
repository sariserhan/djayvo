import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { accountsConfigured, services } from '../../../lib/services';
import { PlayTrack } from '../../player';
import { PlaylistAdd, ReportTrack } from '../controls';
export const dynamic='force-dynamic';
export default async function TrackPage({params}:{params:Promise<{id:string}>}) {
  if(!accountsConfigured())notFound();const {catalogue,auth}=services();if(!catalogue)notFound();
  let track;try{track=await catalogue.track((await params).id);}catch{notFound();}
  const session=await auth.api.getSession({headers:await headers()});
  const lists=session?.user.emailVerified?await catalogue.playlists(session.user.id):[];
  return <section className="track-detail"><Link href="/catalogue">All music</Link><h1>{track.title}</h1><p>Credited to {track.artist}</p><p>{track.description}</p><p className="muted">{track.strategy.replaceAll('_',' ')} · {track.mood} · {Math.round(track.duration_ms/1000)} seconds</p>
    <PlayTrack track={track}/><p>Public listening only. No commercial reuse or training license is offered.</p>
    {session?.user.emailVerified?<PlaylistAdd trackId={track.id} lists={lists}/>:<p><Link href="/account/sign-in">Sign in</Link> to keep private playlists.</p>}
    <ReportTrack id={track.id}/>
  </section>;
}
