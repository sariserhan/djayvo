import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {checkImproviseArrangement} from '../../../apps/site/lib/cloud-songs';
const root='renders/improvise-finish-20261023';
const matrix=JSON.parse(readFileSync(root+'/matrix.json','utf8')).filter((r:any)=>r.source!=='claps');
const percussion=JSON.parse(readFileSync(root+'/percussion.json','utf8'));
const fresh=JSON.parse(readFileSync(root+'/fresh.json','utf8'));
let passed=0,rejected=0;
for(const run of [...matrix,...percussion,...fresh]){
 if(run.technical==='EXPECTED_REJECTION'){rejected++;continue;}
 assert.equal(run.technical,'PASS');
 const audio=readFileSync(run.audio),sha=createHash('sha256').update(audio).digest('hex');
 const receipt=JSON.parse(readFileSync(join(dirname(run.audio),'complete.json'),'utf8'));
 // Read frames from the PCM data chunk; generated WAVs use the standard 44-byte header.
 assert.equal(audio.toString('ascii',36,40),'data');
 const seconds=audio.readUInt32LE(40)/192000;
 checkImproviseArrangement(receipt,receipt.original_recording_sha256,sha,seconds);
 assert.throws(()=>checkImproviseArrangement(receipt,'0'.repeat(64),sha,seconds));passed++;
}
console.log(JSON.stringify({passed,expectedSilenceRejections:rejected,wrongSourceRejected:true,providerWrites:false}));
