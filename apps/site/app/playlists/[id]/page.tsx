import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { accountsConfigured, services } from '../../../lib/services';
import { PlaylistRemove } from '../../catalogue/controls';
import { PlayTrack } from '../../player';
export const dynamic='force-dynamic';
export default async function Playlist({params}:{params:Promise<{id:string}>}) {
  if(!accountsConfigured())redirect('/account/sign-in');const {catalogue,auth}=services();
  const session=await auth.api.getSession({headers:await headers()});if(!session?.user.emailVerified)redirect('/account/sign-in');if(!catalogue)notFound();
  let list;try{list=await catalogue.playlist(session.user.id,(await params).id);}catch{notFound();}
  return <section><Link href="/playlists">All playlists</Link><h1>{list.title}</h1><p>Private to your account.</p><PlaylistRemove id={list.id}/>
    <ul className="catalogue-list">{list.tracks.map(track=><li key={track.id}><div><Link href={`/catalogue/${track.id}`}><h2>{track.title}</h2></Link><p>{track.artist}</p></div><PlayTrack track={track} queue={list.tracks}/><PlaylistRemove id={list.id} track={track.id}/></li>)}</ul>
    {!list.tracks.length&&<p>No available tracks in this playlist.</p>}
  </section>;
}
