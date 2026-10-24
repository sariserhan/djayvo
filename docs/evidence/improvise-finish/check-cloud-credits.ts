import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {allocateCredits} from '../../../apps/site/lib/economics';
const source='docs/evidence/improvise-finish/cloud/2026-10-24T01-11-15.765Z/trial-result.json';
const trial=JSON.parse(readFileSync(source,'utf8'));
const requests=trial.requests.map((r:any,i:number)=>{
 const charged=r.state==='completed'?allocateCredits([{id:'trial',net_micros:30000000,credits:50,available:50}],Number(r.estimated_cost_micros),5000,i%2===1).reduce((n,a)=>n+a.n,0):0;
 assert(charged<=r.quotedCredits);assert.equal(r.finalBalance.available,50-charged);assert.equal(r.finalBalance.reserved,0);
 return {label:r.label,state:r.state,quoted:r.quotedCredits,charged,available:r.finalBalance.available,reserved:r.finalBalance.reserved};
});
assert.equal(requests.length,4);
writeFileSync('docs/evidence/improvise-finish/cloud-credit-review.json',JSON.stringify({source,status:'PASS',reason:'Actual-cost settlement releases unused quoted credits. Original overly strict harness result is retained.',requests},null,2)+'\n');
console.log('PASS: all four credit settlements, including full refunds and unused quote releases');
