import type {MetadataRoute} from 'next';
import {origin} from '../lib/product';
import {comingSoonEnabled} from '../lib/coming-soon';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots {
 return {rules:{userAgent:'*',allow:comingSoonEnabled()?['/$','/privacy$','/terms$','/licenses$']:'/',
  disallow:comingSoonEnabled()?'/':['/api/','/admin','/account','/library','/playlists','/review','/studio/','/academy-offline/','/academy/lessons/','/academy/challenges/','/academy/practice','/academy/progress','/academy/learn','/academy/checkout','/academy/success']},sitemap:origin+'/sitemap.xml'};
}
