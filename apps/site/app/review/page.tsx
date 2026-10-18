import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { accountsConfigured, services, isReviewer } from '../../lib/services';
import { ReviewTrack } from '../catalogue/controls';
export const dynamic='force-dynamic';
export default async function ReviewPage() {
  if(!accountsConfigured())notFound();const {auth,catalogue}=services();
  const session=await auth.api.getSession({headers:await headers()});if(!catalogue||!isReviewer(session?.user))notFound();
  const tracks=await catalogue.queue();
  return <section><h1>Catalogue review.</h1><p>Listen to the full mix and verify its public-listening permissions before approval. A submitter cannot approve their own track. Review does not certify commercial licensing or formal musical quality.</p>
    {!tracks.length?<p>No submissions or reports waiting.</p>:<ul className="library-list">{tracks.map(track=><li key={track.id}><h2>{track.title}</h2><p>{track.artist} · {track.mood}</p><p>{track.description}</p><audio controls preload="none" aria-label={`Review ${track.title}`} src={`/api/catalogue/${track.id}/review-audio`}/>
      {track.reports>10&&<p>Showing 10 of {track.reports} concerns. This decision resolves only those shown; remaining concerns are retained for further review.</p>}
      {track.reasons.map((reason:string,index:number)=><p key={index}>Reported concern: {reason}</p>)}<ReviewTrack id={track.id} revision={track.revision}/></li>)}</ul>}
  </section>;
}
