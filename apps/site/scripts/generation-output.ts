import './env';
import {readFile,stat} from 'node:fs/promises';
import {readConfig} from '../lib/config';import {createPool} from '../lib/database';import {audioStore} from '../lib/audio-store';import {GenerationOutput} from '../lib/generation-output';import {MAX_AUDIO_BYTES} from '../lib/audio-validation';
const config=readConfig(),url=new URL(config.databaseURL),target=url.host+url.pathname;
if(process.env.JAMLOOM_OUTPUT_TARGET!==target)throw Error('Output target confirmation does not match');
const store=audioStore(config);if(!store)throw Error('Private audio storage is required');
const [action,id,path,title,strategy]=process.argv.slice(2);
if(!['stage','complete'].includes(action)||!id)throw Error('Use stage JOB WAV TITLE STRATEGY or complete JOB');
const pool=createPool(config.databaseURL);
try{
 const service=new GenerationOutput(pool,store);
 if(action==='stage'){
  if(!path||!title||!strategy||(await stat(path)).size>MAX_AUDIO_BYTES)throw Error('Bounded WAV, title and strategy required');
  await service.stage(id,process.env.JAMLOOM_WORKER_LEASE??'',await readFile(path),title,strategy);
  console.log(JSON.stringify({id,state:'staged',settlement:'awaiting provider shutdown and final all-in cost evidence'}));
 }else console.log(JSON.stringify(await service.complete(id)));
}finally{await pool.end();}
