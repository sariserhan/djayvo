/** Local private audition server; the installed static server supports audio seeking. */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../apps/site/package.json',import.meta.url));
const send=require('next/dist/compiled/send');
const renders=await realpath(fileURLToPath(new URL('../renders/',import.meta.url)));
const root=await realpath(process.argv[2]??`${renders}/local-call-edit-20261022/review`);
if(!root.startsWith(renders+'/'))throw new Error('Choose a private review directory inside renders');
createServer((req,res)=>{
 let path;
 try {path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}
 catch {res.writeHead(400).end();return}
 if(path==='/favicon.ico'){res.writeHead(204).end();return}
 if(path==='/')path='/index.html';
 if(!/^\/[a-zA-Z0-9_-]+\.(html|wav)$/.test(path)){res.writeHead(404).end();return}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 res.setHeader('Cache-Control','no-store');
 send(req,path,{root,index:false,dotfiles:'deny',cacheControl:false})
  .on('error',error=>{if(!res.headersSent)res.writeHead(error.statusCode??500);res.end()}).pipe(res);
}).listen(4197,'127.0.0.1',()=>console.log('Private listening page: http://127.0.0.1:4197/'));
