import './route-state.css';

export default function LoadingState({label='Loading your music…'}:{label?:string}) {
  return <section className="loading-state" aria-busy="true" aria-label={label}><p role="status">{label}</p><div className="skeleton-heading" aria-hidden="true"/><div className="skeleton-grid" aria-hidden="true">{[0,1,2].map(i=><div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div></section>;
}
