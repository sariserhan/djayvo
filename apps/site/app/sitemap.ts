import {comingSoonEnabled} from '../lib/coming-soon';
export const dynamic='force-dynamic';
import {academyLevels} from '../lib/academy-content';
import type {MetadataRoute} from 'next';
import {origin,features} from '../lib/product';
import {information,guides} from '../lib/editorial';
export default function sitemap():MetadataRoute.Sitemap{if(comingSoonEnabled())return [{url:origin+'/'}];return ['/',...features.map(f=>'/'+f.slug),...academyLevels.map(l=>'/academy/levels/'+l.slug),...Object.keys(information).map(p=>'/'+p),'/learn',...Object.keys(guides).map(p=>'/learn/'+p)].map(path=>({url:origin+path}));}
