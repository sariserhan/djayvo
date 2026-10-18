// Private comparison server; reuse the installed static-file implementation for audio ranges.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
const require=createRequire(process.cwd()+'/apps/site/package.json');
const send=require('next/dist/compiled/send');
const root=resolve('renders/style-training-20261018');
createServer((request,response)=>{
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
  const path=new URL(request.url,'http://localhost').pathname.replace(/^\/review\/$/,'/review/index.html');
  if(!/^\/review\/(?:index\.html|pair-[1-4]-[AB]\.wav)$/.test(path)){
    response.writeHead(404);response.end();return;
  }
  response.setHeader('Cache-Control','no-store');
  send(request,path,{root,cacheControl:false,dotfiles:'deny'}).on('error',error=>{
    if(!response.headersSent)response.writeHead(error.statusCode||500);
    response.end();
  }).pipe(response);
}).listen(4193,'127.0.0.1',()=>console.log('Private review: http://127.0.0.1:4193/review/'));
