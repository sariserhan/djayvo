import {ImproviseCreate} from './create';
import {SongGallery} from '../music-dna/song-gallery';
import {CommunityMusic} from '../community';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Improvise — Your sound into a song','Record or import a sound. Choose a style and turn it into an original song with AI singing.','/improvise');
export default function Improvise(){return <div className="improvise-workspace">
 <section className="studio-intro" aria-labelledby="improvise-title"><div><p className="eyebrow">Improvise</p><h1 id="improvise-title">A little sound.<br/><span>A whole new song.</span></h1></div><div className="intro-note"><p className="intro">Your idea. A new rhythm.<br/>A singer to bring it to life.</p><span className="local-note">Record · Choose · Create</span></div></section>
 <ImproviseCreate/>
 <SongGallery scope="mine" title="Your songs" product="improvise"/>
 <SongGallery scope="public" title="Made with Improvise" product="improvise"/>
 <details className="improvise-local"><summary>Looking for your local remixes?</summary><p>The earlier remix tool runs on your device. Open it to make a free local remix or manage mixes you saved in this browser.</p><a className="secondary" href="/studio/index.html">Open local remixes</a></details>
 <CommunityMusic/>
 </div>}
