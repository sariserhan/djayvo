/** Read-only public-playlist rehearsal; writes a local receipt, never changes favorites. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {playlistTaste} from '../lib/playlist-taste';
const url=process.argv[2],directory=process.argv[3];
if(!url||!directory)throw Error('Usage: check-playlist-coverage.ts YOUTUBE_PLAYLIST OUTPUT_DIRECTORY');
const output=resolve(directory);await mkdir(output,{recursive:true});
const origin='http://127.0.0.1:4235',responses:unknown[]=[];
const result=await playlistTaste(url,AbortSignal.timeout(30*60_000),p=>console.log(JSON.stringify(p)),async(path,init)=>{
 const response=await fetch(new URL(String(path),origin),{...init,headers:{...init?.headers,origin}});
 if(response.ok){responses.push({request:JSON.parse(String(init?.body)),response:await response.clone().json()});await writeFile(resolve(output,'responses.json'),JSON.stringify(responses,null,2));}
 return response;
});
await writeFile(resolve(output,'result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({read:result.read,matched:result.songs.length,unmatched:result.unmatched.length,skipped:result.skipped}));
