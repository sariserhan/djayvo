import Link from 'next/link';
import {SongGallery} from '../music-dna/song-gallery';
export const metadata={title:'Listen to language and style tests'};
export default function Listening(){return <div className="music-dna-page"><SongGallery scope="validation" title="Language & style listening room"/><p>Tell us the song title and timestamp if something sounds awkward. Rate only languages you understand.</p><div className="product-actions"><Link href="/music-dna">Music DNA</Link><Link href="/improvise">Improvise</Link></div></div>}
