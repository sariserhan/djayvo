// Describes repeated note structures; not a musicality or copyright detector.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {compositionKey} from '../../web/novelty.js';
const root=new URL('../../../',import.meta.url),folder=new URL('renders/full-product-baseline-20261020/',root);
const frozen=JSON.parse(await readFile(new URL('freeze.json',folder),'utf8'));assert.equal(frozen.inputs.length,10);
const rows=[];
for(let i=0;i<frozen.inputs.length;i++){
 const input=frozen.inputs[i],style=frozen.styles[i],bytes=await readFile(new URL(`${input.id}/A.${style}.score.json`,folder)),score=JSON.parse(bytes);
 rows.push({input:input.id,style,plan_sha256:createHash('sha256').update(bytes).digest('hex'),composition_key:await compositionKey(score),tracks:score.tracks.map(t=>({instrument:t.instrument,notes:t.events.length,structure:createHash('sha256').update(JSON.stringify(t.events.map(e=>[e.start_tick,e.duration_ticks,e.note-(t.instrument==='drums'?0:score.key.tonic_midi)]))).digest('hex')}))});
}
const collisions=(field,items)=>Object.values(Object.groupBy(items,r=>r[field])).filter(g=>g.length>1).map(g=>g.map(r=>r.input));
const report={status:'PASS',quality:'NOT RUN',method:'Existing studio compositionKey, ignoring tempo, tonic transposition, opening, velocities and sample takes. Track comparison ignores velocities and key. Exact structure only; not perceptual similarity.',seed:frozen.seed,records:rows,repeated_compositions:collisions('composition_key',rows),repeated_tracks:[]};
for(const instrument of new Set(rows.flatMap(r=>r.tracks.map(t=>t.instrument)))){
 const items=rows.flatMap(r=>r.tracks.filter(t=>t.instrument===instrument).map(t=>({...t,input:r.input})));
 report.repeated_tracks.push({instrument,groups:collisions('structure',items)});
}
await writeFile(new URL('docs/evidence/full-product/audio-variety.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({records:rows.length,repeated_compositions:report.repeated_compositions,repeated_tracks:report.repeated_tracks},null,2));
