import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readConfig} from '../lib/config';
import {createPool} from '../lib/database';
import {audioStore} from '../lib/audio-store';
import {LocalGeneration} from '../lib/generation-local';
const config=readConfig();
if(!config.local||process.env.JAMLOOM_GENERATION_SANDBOX!=='true')throw Error('Worker requires an explicitly enabled loopback rehearsal');
const store=audioStore(config);if(!store?.local)throw Error('Local storage required');
const pool=createPool(config.databaseURL);
const directory=resolve(process.env.JAMLOOM_GENERATION_WORK_DIR??'../../renders/local-generation');
try{
 await mkdir(directory,{recursive:true,mode:0o700});
 const result=await new LocalGeneration(pool,store,config.secret).run(resolve(process.env.JAMLOOM_RENDERER??'../../build-finish/jamloom_remix'),directory);
 console.log(result?JSON.stringify(result):'No queued local work.');
}finally{await pool.end();}
