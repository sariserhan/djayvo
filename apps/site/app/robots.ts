import type {MetadataRoute} from 'next';
import {origin} from '../lib/product';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin', '/account/','/library','/playlists','/review','/studio/']},sitemap:origin+'/sitemap.xml'};}
