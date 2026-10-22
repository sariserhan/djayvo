import {LiveSource} from './controls';
import './live-deck.css';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Live DJ effects on permitted tab audio','Process a selected local audio source with live tone, echo and volume. Explicit consent, visible capture and stop controls.','/live-dj');
export default function LiveDJ(){return <><div className="live-page-intro"><p className="eyebrow">Live DJ · Experimental preview</p><h1>Your apps. Your live set.</h1><p>Choose a source, shape the sound, and play with it.</p></div><LiveSource/></>}
