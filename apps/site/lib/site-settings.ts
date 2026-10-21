import type {Pool,PoolClient} from 'pg';
import {AudioError} from './audio-validation';
export type BillingMode='test'|'live';
export type SiteSettings={revision:number;maintenance:boolean;maintenance_message:string;banner:string;billing_mode:BillingMode};
export const defaultSettings:SiteSettings={revision:0,maintenance:false,maintenance_message:'We are tuning things up. Please check back shortly.',banner:'',billing_mode:'test'};
let cached:{pool:Pool;expires:number;value:SiteSettings}|undefined;
export async function siteSettings(db:Pool|PoolClient):Promise<SiteSettings>{
 const row=(await db.query('SELECT revision,maintenance,maintenance_message,banner,billing_mode FROM site_settings WHERE id=1')).rows[0];
 if(!row)throw new Error('Site settings missing');return row;
}
export async function cachedSiteSettings(pool:Pool){
 if(cached?.pool===pool&&cached.expires>Date.now())return cached.value;
 const value=await siteSettings(pool);cached={pool,expires:Date.now()+5000,value};return value;
}
export function invalidateSiteSettings(){cached=undefined;}
export function settingsInput(v:Record<string,unknown>):SiteSettings{
 if(Object.keys(v).sort().join(',')!=='banner,billing_mode,maintenance,maintenance_message,revision'||
  !Number.isSafeInteger(v.revision)||Number(v.revision)<0||typeof v.maintenance!=='boolean'||(typeof v.billing_mode!=='string'||!['test','live'].includes(v.billing_mode))||
  typeof v.banner!=='string'||v.banner.length>500||typeof v.maintenance_message!=='string'||!v.maintenance_message.trim()||v.maintenance_message.length>500||
  /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v.banner+v.maintenance_message))throw new AudioError('Invalid site settings.');
 return {...v,banner:v.banner.trim(),maintenance_message:v.maintenance_message.trim()} as SiteSettings;
}
