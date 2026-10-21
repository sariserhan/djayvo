import type {MetadataRoute} from 'next';
import {origin,features} from '../lib/product';
import {information,guides} from '../lib/editorial';
export default function sitemap():MetadataRoute.Sitemap{return ['/',...features.map(f=>'/'+f.slug),...Object.keys(information).map(p=>'/'+p),'/learn',...Object.keys(guides).map(p=>'/learn/'+p)].map(path=>({url:origin+path}));}
