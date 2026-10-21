import {ProductIntro} from '../product-intro';
import {LiveSource} from './controls';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Live DJ effects on permitted tab audio','Process a selected local audio source with live tone, echo and volume. Explicit consent, visible capture and stop controls.','/live-dj');
export default function LiveDJ(){return <><ProductIntro slug="live-dj"/><LiveSource/></>}
