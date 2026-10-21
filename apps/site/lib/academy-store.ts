import type {Pool,PoolClient} from 'pg';import {createHash} from 'node:crypto';
import {siteSettings} from './site-settings';
import {academyLesson,ACADEMY_VERSION} from './academy-content';
import {evaluateTask,EVALUATOR_VERSION} from '../../web/academy-evaluator.js';
export class AcademyStore {
 constructor(private pool:Pool){}
 async access(owner:string,db:Pool|PoolClient=this.pool,live?:boolean){
  live??=(await siteSettings(db)).billing_mode==='live';
  return !!(await db.query('SELECT 1 FROM academy_purchases WHERE owner_id=$1 AND sandbox=$2 AND NOT refund_hold AND NOT dispute_hold LIMIT 1',[owner,!live])).rowCount;
 }
 async progress(owner:string){return (await this.pool.query(`SELECT a.id,a.lesson_id,a.version,a.started_at,a.completed_at,
  COALESCE(jsonb_agg(jsonb_build_object('taskId',r.task_id,'metrics',r.metrics)) FILTER(WHERE r.task_id IS NOT NULL),'[]') AS checks
  FROM academy_attempts a LEFT JOIN academy_task_results r ON r.attempt_id=a.id WHERE a.owner_id=$1
  GROUP BY a.id ORDER BY a.started_at DESC LIMIT 100`,[owner])).rows;}
 async allowed(owner:string,id:string,db:Pool|PoolClient=this.pool){
  const lesson=academyLesson(id);if(!lesson)throw new Error('Unknown lesson');
  if(!lesson.free&&!await this.access(owner,db))throw new Error('Academy pass required');
  for(const prerequisite of lesson.prerequisites)if(!(await db.query('SELECT 1 FROM academy_attempts WHERE owner_id=$1 AND lesson_id=$2 AND version=$3 AND completed_at IS NOT NULL LIMIT 1',[owner,prerequisite,ACADEMY_VERSION])).rowCount)throw new Error('Complete the prerequisite lesson first');
  return lesson;
 }
 async begin(owner:string,id:string){
  await this.allowed(owner,id);const db=await this.pool.connect();
  try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy-attempt:'+owner]);
   const usage=await db.query(`INSERT INTO academy_daily_usage(owner_id,day,attempts) VALUES($1,current_date,1)
    ON CONFLICT(owner_id) DO UPDATE SET day=current_date,attempts=CASE WHEN academy_daily_usage.day=current_date THEN academy_daily_usage.attempts+1 ELSE 1 END
    WHERE academy_daily_usage.day<>current_date OR academy_daily_usage.attempts<100 RETURNING attempts`,[owner]);
   if(!usage.rowCount)throw new Error('Daily practice sync limit reached; local practice is unlimited');
   const row=(await db.query('INSERT INTO academy_attempts(owner_id,lesson_id,version) VALUES($1,$2,$3) RETURNING id',[owner,id,ACADEMY_VERSION])).rows[0];await db.query(`DELETE FROM academy_attempts WHERE owner_id=$1
    AND id NOT IN(SELECT id FROM academy_attempts WHERE owner_id=$1 ORDER BY started_at DESC,id DESC LIMIT 20)
    AND id NOT IN(SELECT DISTINCT ON(lesson_id) id FROM academy_attempts WHERE owner_id=$1 AND version=$2 AND completed_at IS NOT NULL ORDER BY lesson_id,completed_at DESC)`,[owner,ACADEMY_VERSION]);
   await db.query('COMMIT');return row.id as string;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async submit(owner:string,data:any,assetHashes:string[]){
  if(!data||typeof data!=='object'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(data.attemptId??'')||typeof data.taskId!=='string'||data.evaluator!==EVALUATOR_VERSION||JSON.stringify(data.assets)!==JSON.stringify(assetHashes))throw new Error('Invalid assessment evidence');
  const digest=createHash('sha256').update(JSON.stringify(data)).digest('hex'),db=await this.pool.connect();
  try{await db.query('BEGIN');
   const attempt=(await db.query('SELECT * FROM academy_attempts WHERE id=$1 AND owner_id=$2 FOR UPDATE',[data.attemptId,owner])).rows[0];
   if(!attempt||attempt.version!==ACADEMY_VERSION||new Date(attempt.expires_at).getTime()<Date.now())throw new Error('Unknown or expired attempt');
   const lesson=await this.allowed(owner,attempt.lesson_id,db);
   const prior=(await db.query('SELECT * FROM academy_task_results WHERE attempt_id=$1 ORDER BY completed_at,task_id',[attempt.id])).rows;
   const existing=prior.find(r=>r.task_id===data.taskId);
   if(existing){if(existing.digest!==digest)throw new Error('Assessment replay conflict');await db.query('COMMIT');return {saved:true,completed:!!attempt.completed_at};}
   const task=lesson.tasks[prior.length];if(!task||task.id!==data.taskId)throw new Error('Complete tasks in order');
   const result=evaluateTask(task,data);if(!result.pass||!('metrics' in result))throw new Error(result.feedback);
   const first=data.samples[0].t,last=data.samples.at(-1).t;
   if(last-first>(Date.now()-new Date(attempt.started_at).getTime())/1000+1||prior.some(r=>r.last_audio_time>=first))throw new Error('Assessment timing conflict');
   await db.query('INSERT INTO academy_task_results(attempt_id,task_id,digest,metrics,last_audio_time) VALUES($1,$2,$3,$4,$5)',[attempt.id,task.id,digest,JSON.stringify(result.metrics),last]);
   const completed=prior.length+1===lesson.tasks.length;
   if(completed)await db.query('UPDATE academy_attempts SET completed_at=now() WHERE id=$1',[attempt.id]);
   await db.query('COMMIT');return {saved:true,completed};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async removeProgress(owner:string){await this.pool.query('DELETE FROM academy_attempts WHERE owner_id=$1',[owner]);}
}
