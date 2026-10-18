'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="account-panel"><h1>Something went wrong.</h1><p>Your local mixes are still in the studio.</p><button className="secondary" onClick={reset}>Try again</button><div className="account-links"><a href="/">Back to the studio</a></div></section>;
}
