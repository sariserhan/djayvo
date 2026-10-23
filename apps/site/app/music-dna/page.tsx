import {ProductIntro} from '../product-intro';
import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
import {SongGallery} from './song-gallery';
export const metadata=pageMetadata('My Music DNA','Add favorite songs and artists, and create an original song with AI singing, lyrics and a full arrangement.','/music-dna');
export default function MusicDNA(){return <><ProductIntro slug="music-dna"/><TasteNotebook/><SongGallery scope="mine" title="Your songs"/><SongGallery scope="public" title="Community songs"/><SongGallery scope="examples" title="Made with Music DNA"/></>}
