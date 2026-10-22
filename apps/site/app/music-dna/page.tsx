import {ProductIntro} from '../product-intro';
import {TasteNotebook} from './controls';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('My Music DNA','Add favorite songs and artists, discover your shared styles and compose original instrumental music automatically.','/music-dna');
export default function MusicDNA(){return <><ProductIntro slug="music-dna"/><TasteNotebook/></>}
