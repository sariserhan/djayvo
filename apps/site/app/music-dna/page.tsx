import {ProductIntro} from '../product-intro';
import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('My Music DNA','Build an explicit music preference profile and explore creative directions without downloading or training on favourite songs.','/music-dna');
export default function MusicDNA(){return <><ProductIntro slug="music-dna"/><TasteNotebook/></>}
