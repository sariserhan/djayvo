'use client';
import ErrorPage from './error';
import './route-state.css';

export default function GlobalError({retry}:{retry:()=>void}) {
  return <html lang="en"><head><title>Something went wrong · Jamloom</title><meta name="robots" content="noindex, nofollow"/></head><body className="global-error"><main><ErrorPage retry={retry}/></main></body></html>;
}
