import Link from 'next/link';
import { accountsConfigured, services } from '../../lib/services';
import { CatalogueFilters } from './controls';
import { PlayTrack } from '../player';
import type { PublicTrack } from '../../lib/catalogue';
export const dynamic='force-dynamic';
export default async function CataloguePage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const filters=await searchParams;
  const catalogue=accountsConfigured()?services().catalogue:null;
  let result:{tracks:PublicTrack[];next:string|null}={tracks:[],next:null},invalid=false;
  try{if(catalogue)result=await catalogue.list(filters.q,filters.strategy,filters.mood,filters.after);}catch{invalid=true;}
  return <section><p className="eyebrow">The listening room</p><h1>Music worth discovering.</h1><p className="library-note">Finished mixes reviewed for public listening. Public listening does not grant commercial reuse or training rights.</p>
    <CatalogueFilters key={JSON.stringify(filters)} q={filters.q} strategy={filters.strategy} mood={filters.mood}/>
    {!catalogue?<div className="empty"><h2>The catalogue is getting ready.</h2><p>In the meantime, turn your own sound into something new.</p><a className="secondary" href="/studio/index.html">Open voice studio</a></div>:invalid?<p role="alert">Unable to load these filters. Clear them and try again.</p>:result.tracks.length?<ul className="catalogue-list">{result.tracks.map(track=><li key={track.id}><div><Link href={`/catalogue/${track.id}`}><h2>{track.title}</h2></Link><p>{track.artist}</p><p className="muted">{track.strategy.replaceAll('_',' ')} · {track.mood} · {Math.round(track.duration_ms/1000)} seconds</p></div><PlayTrack track={track} queue={result.tracks}/></li>)}</ul>:<div className="empty"><h2>No reviewed tracks yet.</h2><p>Try another filter or make your own mix in the studio.</p></div>}
    {result.next&&<Link href={'/catalogue?'+new URLSearchParams({...filters,after:result.next} as Record<string,string>)}>More tracks</Link>}
  </section>;
}
