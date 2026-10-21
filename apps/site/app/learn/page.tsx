import {guides} from '../../lib/editorial';
import {pageMetadata} from '../../lib/product';
export const metadata=pageMetadata('Learn Jamloom','Practical guides to voice remixing, laptop DJ mixing and permitted live audio processing.','/learn');
export default function Learn(){return <section className="product-document"><p className="eyebrow">Start with a sound</p><h1>Learn by playing.</h1>{Object.entries(guides).map(([slug,g])=><article className="product-panel" key={slug}><h2><a href={'/learn/'+slug}>{g.title}</a></h2><p>{g.description}</p></article>)}</section>}
