'use client';
import './route-state.css';
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <section className="route-state"><p className="route-state-label">Jamloom / Something went wrong</p><h1>Let’s get you back in the groove.</h1><p>This page couldn’t load. Try again, or contact support if it keeps happening.</p><div className="route-state-actions"><button onClick={retry}>Try again</button><a href="/">Go home</a><a href="/support">Contact support</a></div></section>;
}
