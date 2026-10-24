import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {requestDeletion,deletionRequest} from '../lib/account-deletion';
test('deletion requests require recent verified sign-in, preserve data and deduplicate concurrent retries',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_delete_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href);
 try{
  await migrate(pool);
  for(const [id,verified] of [['alice',true],['bob',true],['unverified',false]])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,$3)',[id,id+'@example.test',verified]);
  for(const [user,date,confirmation] of [['alice',new Date(),false],['alice',new Date(0),true],['alice',new Date('invalid'),true],['unverified',new Date(),true],['missing',new Date(),true]] as const)await assert.rejects(requestDeletion(pool,'http://127.0.0.1:3000',user,date,confirmation));
  assert.equal((await pool.query('SELECT count(*)::int n FROM support_tickets')).rows[0].n,0);
  const results=await Promise.all([1,2,3].map(()=>requestDeletion(pool,'http://127.0.0.1:3000','alice',new Date(),true)));
  assert.equal(new Set(results.map(row=>row.id)).size,1);assert.equal(results[0].status,'open');
  assert.equal((await deletionRequest(pool,'alice')).id,results[0].id);assert.equal(await deletionRequest(pool,'bob'),null);
  assert.equal((await pool.query('SELECT count(*)::int n FROM notification_outbox')).rows[0].n,1);
  assert.equal((await pool.query('SELECT count(*)::int n FROM "user"')).rows[0].n,3);
  const row=(await pool.query('SELECT owner_id,email,body FROM support_tickets')).rows[0];assert.equal(row.owner_id,'alice');assert.equal(row.email,'alice@example.test');assert.match(row.body,/not evidence of completed deletion/);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
