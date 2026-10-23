import { features } from '../lib/product';
import {homeProducts} from '../lib/home-products';
export function ProductIntro({slug}:{slug:typeof features[number]['slug']}) {
  const f=features.find(f=>f.slug===slug)!;
  const product=homeProducts.find(p=>p.slug===slug)!;
  return <section className="product-intro"><p className="eyebrow">{f.title}</p><h1>{product.headline}</h1><p className="product-lead">{product.description}</p><details className="availability"><summary>{f.status} · Details</summary><p>{f.platform}. {f.detail}</p></details></section>;
}
