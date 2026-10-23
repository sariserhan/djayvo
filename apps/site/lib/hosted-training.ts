import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {Pool} from 'pg';
import {validateFeedback} from './dna-feedback-schema';

// Text-planner research only: no reference audio, user identifiers or serving-model promotion.
export async function hostedTrainingSnapshot(pool:Pool,live=true){
 const rows=(await pool.query(`SELECT d.id,d.profile,d.song_plan,d.audio_sha256,c.provider_receipt,f.feedback
  FROM song_feedback f JOIN dna_song_jobs d ON d.id=f.song_id JOIN cloud_song_runs c ON c.id=d.id
  JOIN "user" u ON u.id=d.owner_id
  WHERE f.owner_id=d.owner_id AND NOT u.suspended AND d.product='music-dna' AND d.billing_live=$1
  AND d.state='completed' AND d.withdrawn_at IS NULL AND f.feedback->>'trainingConsent'='true'
  AND f.feedback->>'consentVersion'='1' ORDER BY d.id`,[live])).rows;
 const records=[];let invalid=0,negative=0;
 for(const row of rows){
  try{
   const feedback=validateFeedback(row.feedback),output=row.provider_receipt?.output;
   if(feedback.rating!=='like'){negative++;continue;}
   if(row.provider_receipt?.status!=='COMPLETED'||output?.id!==row.id||output?.product!=='music-dna'||
    output.fit?.accepted!==true||output.audio_sha256!==row.audio_sha256||output.fit.audio_sha256!==row.audio_sha256||
    !/^[a-f0-9]{64}$/.test(row.audio_sha256)||!isDeepStrictEqual(output.plan,row.song_plan)||
    !Array.isArray(row.profile?.references)||!row.profile.references.length)throw Error('Unverified song');
   const names=[...new Set<string>(row.profile.references.map((name:string)=>name.normalize('NFKC').trim().toLowerCase()))].sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
   const group=createHash('sha256').update('['+names.map(name=>JSON.stringify(name)).join(', ')+']').digest('hex');
   const plan=Object.fromEntries(['schema','title','direction','production_sound','musical_traits','cases'].filter(k=>row.song_plan[k]!==undefined).map(k=>[k,row.song_plan[k]]));
   const record={job:row.id,group,plan,audio_sha256:row.audio_sha256,...feedback,consentVersion:1};
   records.push({record,sha256:createHash('sha256').update(JSON.stringify(record)).digest('hex')});
  }catch{invalid++;}
 }
 return {schema:'jamloom-hosted-training-1',checkedAt:new Date().toISOString(),live,records,invalid,negative};
}
