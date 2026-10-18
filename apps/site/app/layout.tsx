import type { Metadata } from 'next';
import '../../web/style.css';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Djayvo', template: '%s · Djayvo' },
  description: 'Turn a few seconds of your sound into music.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <a className="skip" href="#content">Skip to content</a>
    <header><div className="header-inner"><a className="brand" href="/">djayvo</a>
      <nav aria-label="Main"><a href="/">Create</a><a href="/library">Cloud library</a><a href="/account">Account</a></nav>
    </div></header>
    <main id="content" className="account-main">{children}</main>
  </body></html>;
}
