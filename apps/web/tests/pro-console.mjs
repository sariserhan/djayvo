import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '../../site/node_modules/@axe-core/playwright/dist/index.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),assets=path.join(root,'dist/web');
const output=await fs.mkdtemp(path.join(root,'renders/pro-console-')),checks=[];
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname;if(name.startsWith('/api/')){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(name.endsWith('aurowall')?{tracks:[]}:{maintenance:false,announcement:null}));return;}if(!/^\/[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..'))throw Error();const data=await fs.readFile(path.join(assets,name));res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.json':'application/json'})[path.extname(name)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{for(const [name,kind] of Object.entries({chromium,webkit})){
 const browser=await kind.launch();try{const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/dj.html`);await page.waitForSelector('#sample-pad-7',{state:'attached'});
 for(const width of [1920,1440,820,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${width} collapsed overflow`);
  await page.locator('#sampler > details > summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${width} sampler overflow`);
  await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});await page.locator('#sampler > details > summary').click();
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#dj').evaluate(n=>n.classList.add('studio-expanded'));
 const layout=await page.evaluate(()=>['sampler','recordings','session-notes'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));assert.ok(layout[0].bottom<=layout[1].top&&layout[1].bottom<=layout[2].top);
 await page.locator('#dj').evaluate(n=>n.classList.remove('studio-expanded'));
 await page.setViewportSize({width:1440,height:1000});await page.locator('#music-rights').check();await page.locator('details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
 const result=await new AxeBuilder({page}).analyze();await fs.writeFile(path.join(output,`${name}-axe.json`),JSON.stringify(result.violations,null,2));assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#vinyl-a').evaluate(node=>getComputedStyle(node).transform),'none');
 assert.deepEqual(errors,[]);checks.push({browser:name,responsive:'PASS',accessibility:'PASS',reducedMotion:'PASS',errors});
 }finally{await browser.close();}
}await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',output);}finally{server.closeAllConnections();server.close();}
