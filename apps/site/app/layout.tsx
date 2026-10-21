import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { MusicPlayer } from './player';
import '../../web/style.css';
import './site.css';
import './product.css';

export const metadata: Metadata = {
  title: { default: 'Jamloom', template: '%s · Jamloom' },
  description: 'Turn a few seconds of your sound into music.',
  metadataBase: new URL('https://www.jamloom.com'),
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="site-shell"><MusicPlayer>
    <a className="skip" href="#content">Skip to content</a>
    <header><div className="header-inner"><a className="brand" href="/" aria-label="Jamloom home"><img src="/studio/icon.svg" alt="" width="34" height="34" />jamloom</a>
      <nav aria-label="Main"><Link prefetch={false} href="/improvise">Improvise</Link><Link prefetch={false} href="/dj-studio">DJ Studio</Link><Link prefetch={false} href="/music-dna">Music DNA</Link><Link prefetch={false} href="/pricing">Pricing</Link><Link prefetch={false} href="/account">Account</Link></nav>
    </div></header>
    <main id="content" className="account-main">{children}</main>
    <footer className="site-footer"><span>Make something yours.</span><nav aria-label="Footer"><Link prefetch={false} href="/live-dj">Live DJ</Link><Link prefetch={false} href="/catalogue">Catalogue</Link><Link prefetch={false} href="/library">Cloud library</Link><Link prefetch={false} href="/playlists">Playlists</Link><Link prefetch={false} href="/learn">Learn</Link><Link prefetch={false} href="/help">Help</Link><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><Link prefetch={false} href="/licenses">Licenses</Link><Link prefetch={false} href="/status">Status</Link></nav></footer>
  </MusicPlayer>
    <Script src="https://cdn.visitorping.com/site/vp_QBDH92AC.js" strategy="afterInteractive" crossOrigin="anonymous" />
  </body></html>;
}
