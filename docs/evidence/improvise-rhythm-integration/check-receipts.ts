import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkImproviseArrangement} from '../../../apps/site/lib/cloud-songs';

const report=JSON.parse(readFileSync('renders/improvise-rhythm-integration-20261023/report.json','utf8'));
assert.equal(report.runs.length,12);
for(const run of report.runs){
  assert.equal(run.technical,'PASS');
  const audio=readFileSync(run.performance),sha=createHash('sha256').update(audio).digest('hex');
  checkImproviseArrangement(run.receipt,report.original_sha256,sha,30);
  assert.throws(()=>checkImproviseArrangement(run.receipt,'0'.repeat(64),sha,30));
}
console.log('PASS: all 12 real automatic mixes pass the hosted source/output/duration receipt gate; wrong source hashes reject. No provider, storage or database writes.');
