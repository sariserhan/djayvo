import {ProductIntro} from '../product-intro';
import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
import {SongGallery} from './song-gallery';
export const metadata=pageMetadata('My Music DNA','Add favorite songs and artists, and create an original song with AI singing, lyrics and a full arrangement.','/music-dna');
export default function MusicDNA(){return <div className="music-dna-page"><ProductIntro slug="music-dna"/><div className="product-actions"><a className="secondary" href="#public-songs">Listen to all songs ↓</a></div><TasteNotebook/><SongGallery scope="showcase" title="Made with Music DNA"/><div className="dna-collections"><SongGallery scope="mine" title="Your songs"/><SongGallery scope="public" title="Community songs"/></div></div>}
