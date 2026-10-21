// Reuse the audited studio worker; cache only the free lesson and public, licensed assets.
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';import {createHash} from 'node:crypto';import {join} from 'node:path';
import {academyLesson} from '../lib/academy-content';
const target='public/academy-offline',hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');await mkdir(target,{recursive:true});
const tracks=JSON.parse(await readFile('public/academy-audio/manifest.json','utf8')).tracks;
await writeFile(join(target,'lesson.json'),JSON.stringify({lesson:academyLesson('first-crossfade'),tracks}));
const html=(await readFile('public/studio/dj.html','utf8')).replace('<head>','<head><base href="/studio/"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/studio/academy.css">');
await writeFile(join(target,'index.html'),html);
const assets:Record<string,{bytes:number;sha256:string}>={};
async function add(file:string,key:string){const bytes=await readFile(file);if(bytes.length>16*1024*1024)throw Error('Offline asset too large');assets[key]={bytes:bytes.length,sha256:hash(bytes)};}
async function tree(folder:string,prefix:string){for(const name of await readdir(folder)){const file=join(folder,name);if((await stat(file)).isDirectory())await tree(file,prefix+name+'/');else if(name!=='service-worker.js')await add(file,prefix+name);}}
await tree('public/studio','../studio/');await tree('public/academy-audio','../academy-audio/');
for(const name of ['index.html','lesson.json'])await add(join(target,name),name);
const total=Object.values(assets).reduce((n,a)=>n+a.bytes,0);if(total>40*1024*1024)throw Error('Academy offline package exceeds 40 MiB');
const template=(await readFile('../../scripts/service-worker.js','utf8')).replaceAll('djayvo-studio:','jamloom-academy:');
const manifest=JSON.stringify(assets);await writeFile(join(target,'service-worker.js'),template.replace('__JAMLOOM_ASSETS__',manifest).replace('__JAMLOOM_VERSION__',hash(template+manifest)));
console.log(`Prepared free Academy offline pack: ${Object.keys(assets).length} public assets, ${total} bytes. No account or paid content cached.`);
