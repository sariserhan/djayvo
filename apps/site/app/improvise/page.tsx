import {ImproviseCreate} from './create';
import {SongGallery} from '../music-dna/song-gallery';
import {CommunityMusic} from '../community';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Improvise — Your sound into a song','Create a song inspired by your words or sound, with AI singing and your actual recording woven into the music.','/improvise');
export default function Improvise(){return <div className="improvise-workspace">
 <section className="studio-intro" aria-labelledby="improvise-title"><div><p className="eyebrow">Improvise</p><h1 id="improvise-title">Your recording.<br/><span>Part of a new song.</span></h1></div><div className="intro-note"><p className="intro">Your words inspire the song.<br/>Your sound becomes part of the music.</p><span className="local-note">Record · Choose · Create</span></div></section>
 <div className="product-actions"><a className="secondary" href="#public-songs">Listen to songs ↓</a></div>
 <ImproviseCreate/>
 <SongGallery scope="showcase" title="Made with Improvise" product="improvise"/>
 <SongGallery scope="mine" title="Your songs" product="improvise"/>
 <SongGallery scope="public" title="Community songs" product="improvise"/>
 <details className="improvise-local"><summary>Looking for your local remixes?</summary><p>The earlier remix tool runs on your device. Open it to make a free local remix or manage mixes you saved in this browser.</p><a className="secondary" href="/studio/index.html">Open local remixes</a></details>
 <CommunityMusic/>
 </div>}
