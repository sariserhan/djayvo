import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: resolve(process.cwd(), '../..') },
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
      ] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/studio/:path*', headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" },
      ] },
      ...['/academy/lessons/:path*','/academy/practice','/academy/challenges/:path*','/academy-offline/:path*'].map(source=>({source,headers:[
        {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"},
      ]})),
    ];
  },
};
export default config;
