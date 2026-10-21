import './env';
import {createPool} from '../lib/database';
import {VastProvider} from '../lib/vast-provider';
import {GenerationWatchdog} from '../lib/generation-watchdog';

const url=new URL(process.env.DATABASE_URL??'');
const target=url.host+url.pathname,apply=process.argv.includes('--apply');
// No scheduling or provider mutation until an operator explicitly enables this reviewed target.
if(apply&&process.env.JAMLOOM_WATCHDOG_TARGET!==target)throw new Error('Watchdog target confirmation does not match');
const pool=createPool(url.toString());
try{
 const provider=apply?new VastProvider(process.env.VASTAI_KEY??''):{
  inventory:async()=>{throw new Error('Preview cannot contact provider');},
  destroy:async()=>{throw new Error('Preview cannot contact provider');},
 };
 const result=await new GenerationWatchdog(pool,provider).sweep(apply);
 console.log(JSON.stringify({mode:apply?'apply':'preview',target,results:result},null,2));
 if(apply&&result.some(r=>!['settled','settlement_recovered','watchdog_busy'].includes(r.status)))process.exitCode=2;
}finally{await pool.end();}
