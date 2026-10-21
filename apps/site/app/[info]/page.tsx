import { notFound } from 'next/navigation';
import { information } from '../../lib/editorial';
import { pageMetadata } from '../../lib/product';
export function generateStaticParams(){return Object.keys(information).map(info=>({info}));}
export const dynamicParams=false;
export async function generateMetadata({params}:{params:Promise<{info:string}>}){const {info}=await params;const p=information[info as keyof typeof information];if(!p)return {};return pageMetadata(p.title,p.description,'/'+info);}
export default async function Information({params}:{params:Promise<{info:string}>}){const {info}=await params;const p=information[info as keyof typeof information];if(!p)notFound();return <article className="product-document"><p className="eyebrow">Jamloom / {info}</p><h1>{p.title}</h1>{p.paragraphs.map(text=><p key={text}>{text}</p>)}
 {info==='examples'&&<section className="product-panel"><h2>Original instrument study</h2><p>11.6 seconds · drums, bass and piano · engine demonstration</p><audio controls preload="none" aria-label="Original instrument study" src="/audio/instrument-study.mp3"/><a href="/audio/instrument-study.json">Source and rendering record</a></section>}
 {info==='licenses'&&<ul>{['VCSL-LICENSE.txt','VSCO-2-CE-LICENSE.txt','BLACK-AND-GREEN-GUITARS-CC0.txt','EMSCRIPTEN-LICENSE.txt'].map(name=><li key={name}><a href={'/studio/licenses/'+name}>{name}</a></li>)}</ul>}
 <div className="product-actions"><a href="/improvise">Try local remix →</a><a href="/dj-studio">Open the DJ guide →</a><a href="/learn">Read the guides →</a></div></article>}
