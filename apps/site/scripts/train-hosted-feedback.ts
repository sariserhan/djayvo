import './env';
import {mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createPool} from '../lib/database';
import {hostedTrainingSnapshot} from '../lib/hosted-training';

const root=resolve('../..'),folder=resolve(root,'renders/music-dna-training'),path=resolve(folder,'hosted-feedback.json');
const pool=createPool(process.env.DATABASE_URL!);
await mkdir(folder,{recursive:true,mode:0o700});
// A second synchronizer must not refresh another trainer's consent lease.
const lock=resolve(folder,'.hosted-sync');await mkdir(lock);
let child:ReturnType<typeof spawn>|undefined,stopping=false;
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{stopping=true;});
try{
 const sync=async()=>{const snapshot=await hostedTrainingSnapshot(pool);await writeFile(path+'.tmp',JSON.stringify(snapshot),{mode:0o600});await rename(path+'.tmp',path);return snapshot;};
 const snapshot=await sync();
 console.log(JSON.stringify({eligible:snapshot.records.length,invalid:snapshot.invalid,negative:snapshot.negative,live:true}));
 child=spawn(resolve(root,'.venv-singer/bin/python'),[resolve(root,'scripts/train_dna_feedback.py'),...(process.argv.includes('--train')?['--train']:[])],{cwd:root,stdio:'inherit'});
 let done=false;const completion=new Promise<number>((resolve,reject)=>{child!.once('error',reject);child!.once('exit',code=>{done=true;resolve(code??1);});});
 while(!done&&!stopping){await Promise.race([completion,new Promise(r=>setTimeout(r,5000))]);if(!done)await sync();}
 if(stopping)await rm(path,{force:true});
 if(await completion)throw Error('Feedback research did not complete');
}finally{
 // Expire consent first so the trainer can delete any in-progress candidate itself.
 if(child&&child.exitCode===null){await rm(path,{force:true});await new Promise<void>(resolve=>{const timer=setTimeout(()=>{child?.kill('SIGKILL');resolve();},25000);child!.once('exit',()=>{clearTimeout(timer);resolve();});});}
 await pool.end();await rm(lock,{recursive:true});
}
