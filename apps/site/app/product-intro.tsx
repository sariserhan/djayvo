import { features } from '../lib/product';
export function ProductIntro({slug}:{slug:typeof features[number]['slug']}) {
  const f=features.find(f=>f.slug===slug)!;
  return <section className="product-intro"><p className="eyebrow">{f.title} / {f.platform}</p><h1>{f.headline}</h1><p className="product-lead">{f.description}</p><p className="availability">{f.status} — {f.detail}</p></section>;
}
