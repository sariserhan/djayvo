import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV === 'development';
  const account=process.env.R2_ACCOUNT_ID ?? '', bucket=process.env.R2_BUCKET ?? '';
  const storage=process.env.DJAYVO_R2_ENABLED==='true' && /^[a-f0-9]{32}$/.test(account) && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)
    ? ` https://${bucket}.${account}.r2.cloudflarestorage.com` : '';
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${storage}${development ? ' ws: wss:' : ''}; media-src 'self'${storage}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/account/:path*', '/library/:path*','/catalogue/:path*','/playlists/:path*','/review/:path*'] };
