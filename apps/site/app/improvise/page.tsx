import {ImproviseCreate} from './create';
import {SongGallery} from '../music-dna/song-gallery';
import {CommunityMusic} from '../community';
import { ProductIntro } from '../product-intro';
import { pageMetadata } from '../../lib/product';
export const metadata=pageMetadata('AI song studio','Turn a permitted recording into an original AI vocal song. Pick a style, listen and keep your creation.','/improvise');
export default function Improvise(){return <><ProductIntro slug="improvise"/><ImproviseCreate/><SongGallery scope="mine" title="Your songs" product="improvise"/><SongGallery scope="public" title="Made with Improvise" product="improvise"/><section className="product-panel"><h2>Record. Remix. Play.</h2><ol><li>Add your sound.</li><li>Choose a style.</li><li>Listen and keep your favorite.</li></ol><a className="primary" href="/studio/index.html">Start local remix</a><details><summary>Recording and sharing details</summary><p>Free local processing. Record only with permission. Current recording limits and supported formats appear in the workspace. Online saving asks separately for public/private and sharing permission; public saves appear after review. Microphone access needs HTTPS or localhost.</p></details><a href="/learn/voice-remix">Recording and remix guide →</a></section><CommunityMusic/></>}
