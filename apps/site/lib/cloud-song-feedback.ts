import type {DnaContext} from './dna-commerce';
import {validateFeedback} from './dna-feedback-schema';
import {boundedAuthRequest} from './bounded-request';
import {privateHeaders} from './audio-response';
import {songId} from './cloud-songs';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
export async function cloudSongFeedback(request:Request,{commerce,owner}:DnaContext){
 if(!owner)return json({error:'Sign in to save feedback.'},401);
 const url=new URL(request.url),id=url.searchParams.get('id'),pool=commerce.pool;
 if(request.method!=='GET'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-jamloom-dna')!=='1'))return json({error:'Same-origin request required.'},403);
 if(request.method==='DELETE'){
  if(id!==null&&!songId(id))return json({error:'Unknown song.'},400);
  await pool.query('DELETE FROM song_feedback WHERE owner_id=$1 AND ($2::text IS NULL OR song_id=$2)',[owner,id]);return json({deleted:true});
 }
 if(!songId(id))return json({error:'Unknown song.'},400);
 const row=await commerce.row(id);
 if(!row||row.state!=='completed'||row.product!=='music-dna'||(row.owner_id!==owner&&(row.visibility!=='public'||row.withdrawn_at)))return json({error:'This song is not available for feedback.'},404);
 if(request.method==='GET')return json({feedback:(await pool.query('SELECT feedback FROM song_feedback WHERE owner_id=$1 AND song_id=$2',[owner,id])).rows[0]?.feedback??null});
 if(request.method!=='POST')return json({error:'Unknown feedback action.'},400);
 const body=await boundedAuthRequest(request,4096);if(!body)return json({error:'Feedback is too large.'},413);
 let feedback;try{feedback=validateFeedback(await body.json());}catch{return json({error:'Choose a rating and valid feedback options.'},400);}
 if(feedback.trainingConsent&&row.owner_id!==owner)return json({error:'Only the song owner can allow model training.'},403);
 await pool.query(`INSERT INTO song_feedback(owner_id,song_id,feedback) VALUES($1,$2,$3)
  ON CONFLICT(owner_id,song_id) DO UPDATE SET feedback=EXCLUDED.feedback,updated_at=now()`,[owner,id,JSON.stringify(feedback)]);
 return json({feedback});
}
export async function cloudPersonalFeedback(context:DnaContext,genre:string,language:string){
 const rows=(await context.commerce.pool.query(`SELECT f.feedback,d.song_plan,d.language,f.updated_at FROM song_feedback f JOIN dna_song_jobs d ON d.id=f.song_id
  WHERE f.owner_id=$1 AND d.product='music-dna' AND d.billing_live=$2 AND d.state='completed'
  AND (d.owner_id=$1 OR (d.visibility='public' AND d.withdrawn_at IS NULL))
  AND f.feedback->>'personalize'='true' AND d.song_plan->'direction'->>'id'=$3
  AND ($4='auto' OR d.language=$4) ORDER BY f.updated_at DESC LIMIT 12`,[context.owner,!!context.commerce.options.live,genre,language])).rows;
 return rows.map(row=>({rating:row.feedback.rating,tags:row.feedback.tags,language:row.language,traits:row.song_plan.musical_traits??null,bpm:row.song_plan.cases?.[0]?.bpm,updatedAt:row.updated_at.toISOString()}));
}
