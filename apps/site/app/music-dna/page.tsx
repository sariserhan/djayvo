import {ProductIntro} from '../product-intro';
import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('My Music DNA','Add favorite songs and artists, and create an original song with AI singing, lyrics and a full arrangement.','/music-dna');
export default function MusicDNA(){return <><ProductIntro slug="music-dna"/><TasteNotebook/></>}
