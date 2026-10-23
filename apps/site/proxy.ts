import { NextRequest, NextResponse } from 'next/server';
import {readConfig} from './lib/config';
import {cachedSiteSettings} from './lib/site-settings';
import {isAdmin} from './lib/admin-access';
import {comingSoonEnabled,comingSoonRecovery,comingSoonResponse} from './lib/coming-soon';

export async function proxy(request: NextRequest) {
  const path=request.nextUrl.pathname;
  const recovery=/^\/(admin|account|contact|support)(\/|$)/.test(path)||['/maintenance','/api/site-status','/api/contact','/api/notifications','/api/song-jobs','/api/payments/stripe','/api/academy/stripe','/api/pro/stripe','/api/pro/refresh'].includes(path)||path.startsWith('/api/admin/')||path.startsWith('/api/auth/');
  let configured=false;try{readConfig();configured=true;}catch{}
  let launchBypass=false;
  if(comingSoonEnabled()&&!comingSoonRecovery(path)){
    try{if(configured&&request.headers.has('cookie')){const {services}=await import('./lib/services');const session=await services().auth.api.getSession({headers:request.headers});launchBypass=isAdmin(session?.user);}}catch{/* Unavailable authentication never opens the preview. */}
    if(!launchBypass)return comingSoonResponse(request);
  }
  if(!recovery&&configured){
    try{const {services}=await import('./lib/services');const {pool,auth}=services(),settings=await cachedSiteSettings(pool);
      if(settings.maintenance){const session=request.headers.has('cookie')?await auth.api.getSession({headers:request.headers}):null;
        if(!isAdmin(session?.user)){
          if(path.startsWith('/api/'))return NextResponse.json({error:'Jamloom is temporarily under maintenance.'},{status:503,headers:{'Retry-After':'300','Cache-Control':'no-store'}});
          const message=settings.maintenance_message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
          return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance · Jamloom</title><link rel="stylesheet" href="/studio/style.css"></head><body><main><h1>We’ll be back shortly.</h1><p>${message}</p><nav><a href="/support">Support</a> · <a href="/contact">Contact</a> · <a href="/account/sign-in">Owner sign in</a></nav></main></body></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'300','Content-Security-Policy':"default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
        }
      }
    }catch(error){
      // Existing installations can migrate before enabling controls; other DB failures fail closed.
      if((error as {code?:string}).code!=='42P01')return new NextResponse('Jamloom is temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
    }
  }
  if(path==='/studio/dj.html'){
    const response=NextResponse.next();response.headers.set('Cache-Control','private, no-store');
    // The console is public; only a verified purchase grants full-track Pro and offline renewal.
    try{const {services}=await import('./lib/services');const {proAccess}=await import('./lib/pro-access');const {auth,pool}=services();
      const session=request.headers.has('cookie')?await auth.api.getSession({headers:request.headers}):null;
      if(session?.user.emailVerified&&await proAccess(pool,session.user.id,process.env.PRO_BILLING_MODE==='live'))response.headers.set('X-Jamloom-Pro-Expires',String(Date.now()+30*86400000));
    }catch{/* Basic and sample demos remain available without an account service. */}
    return response;
  }
  if(!/^\/(account|library|catalogue|playlists|review|admin|contact|support)(\/|$)/.test(path)){const response=NextResponse.next();if(launchBypass)response.headers.set('Cache-Control','private, no-store');return response;}
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV === 'development';
  const account=process.env.R2_ACCOUNT_ID ?? '', bucket=process.env.R2_BUCKET ?? '';
  const storage=(process.env.JAMLOOM_R2_ENABLED ?? process.env.DJAYVO_R2_ENABLED)==='true' && /^[a-f0-9]{32}$/.test(account) && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)
    ? ` https://${bucket}.${account}.r2.cloudflarestorage.com` : '';
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://ingest.visitorping.com wss://realtime.visitorping.com${storage}${development ? ' ws: wss:' : ''}; media-src 'self'${storage}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:js|mjs|css|wasm|png|svg|jpg|mp3|txt|json|webmanifest)$).*)'] };
