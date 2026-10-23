import {generationProgress} from '../../web/generation-progress';

export type SongProgress={state:string;phase?:string};
export function GenerationProgress({state,phase}:SongProgress){
 const view=generationProgress(state,phase);
 return <div className="generation-progress" data-state={view.key}>
  <div className="generation-progress-art" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i}/>)}</div>
  <div className="generation-progress-copy" role="status" aria-atomic="true"><strong>{view.title}</strong><p>{view.detail}</p></div>
  <ol aria-label="Song progress">{view.steps.map((label,i)=><li key={i} aria-current={i===view.step?'step':undefined} data-done={i<view.step?'true':undefined}>{label}</li>)}</ol>
 </div>;
}
