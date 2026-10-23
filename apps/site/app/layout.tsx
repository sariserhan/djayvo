import type { Metadata } from 'next';
import Link from 'next/link';
import navigation from '../lib/site-navigation.json';
import {VisitorPing} from './visitorping';
import {SiteBanner} from './site-banner';
import { MusicPlayer } from './player';
import '../../web/style.css';
import './site.css';
import './product.css';
import '../../web/generation-progress.css';

export const metadata: Metadata = {
  title: { default: 'Jamloom', template: '%s · Jamloom' },
  description: 'Learn to DJ, mix without a controller, improvise with recordings, explore Music DNA, and shape computer audio with Jamloom Live DJ.',
  metadataBase: new URL('https://www.jamloom.com'),
  icons: { icon: [
    { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
    { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ] },
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="site-shell"><MusicPlayer>
    <a className="skip" href="#content">Skip to content</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="/" aria-label="Jamloom home"><img src="/studio/icon.svg" alt="" width="34" height="34" />jamloom</a>
      <nav aria-label="Main">{navigation.map(({href,label})=><Link key={href} prefetch={false} href={href}>{label}</Link>)}</nav>
    </div></header>
    <SiteBanner/><main id="content" className="account-main">{children}</main>
    <footer className="site-footer"><span>Make something yours. <a href="https://aurowall.com" target="_blank" rel="noopener noreferrer">In partnership with Aurowall ↗</a></span><nav aria-label="Footer"><Link prefetch={false} href="/pro">Pro</Link><Link prefetch={false} href="/live-dj">Live DJ</Link><Link prefetch={false} href="/catalogue">Catalogue</Link><Link prefetch={false} href="/library">Cloud library</Link><Link prefetch={false} href="/playlists">Playlists</Link><Link prefetch={false} href="/learn">Guides</Link><Link prefetch={false} href="/help">Help</Link><Link prefetch={false} href="/contact">Contact</Link><Link prefetch={false} href="/support">Support</Link><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><Link prefetch={false} href="/licenses">Licenses</Link><Link prefetch={false} href="/status">Status</Link></nav></footer>
  </MusicPlayer>
    <VisitorPing/>
  </body></html>;
}
