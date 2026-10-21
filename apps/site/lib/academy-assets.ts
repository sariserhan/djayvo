import {readFile} from 'node:fs/promises';import {join} from 'node:path';
export async function academyTracks(){const manifest=JSON.parse(await readFile(join(process.cwd(),'public/academy-audio/manifest.json'),'utf8'));return manifest.tracks as {id:string;title:string;url:string;sha256:string;bpm:number}[];}
