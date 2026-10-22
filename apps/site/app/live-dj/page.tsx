import {LiveSource} from './controls';
import './live-deck.css';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Live DJ decks for your Mac audio','Mix two permitted app sources with the Mac companion: scratch recent audio, reverse, loop, EQ and crossfade. Explicit consent and visible stop controls.','/live-dj');
export default function LiveDJ(){return <><div className="live-page-intro"><p className="eyebrow">Live DJ · Experimental preview</p><h1>Your apps. Your live set.</h1><p>Mix two sources. Scratch, loop, and shape your sound.</p></div><LiveSource/></>}
