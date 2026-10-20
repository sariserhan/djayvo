import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { MusicPlayer } from './player';
import '../../web/style.css';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Jamloom', template: '%s · Jamloom' },
  description: 'Turn a few seconds of your sound into music.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><MusicPlayer>
    <a className="skip" href="#content">Skip to content</a>
    <header><div className="header-inner"><a className="brand" href="/">jamloom</a>
      <nav aria-label="Main"><a href="/">Create</a><Link href="/catalogue">Music</Link><Link href="/playlists">Playlists</Link><Link href="/library">Cloud library</Link><Link href="/account">Account</Link></nav>
    </div></header>
    <main id="content" className="account-main">{children}</main>
  </MusicPlayer>
    <Script src="https://cdn.visitorping.com/site/vp_QBDH92AC.js" strategy="afterInteractive" crossOrigin="anonymous" />
  </body></html>;
}
