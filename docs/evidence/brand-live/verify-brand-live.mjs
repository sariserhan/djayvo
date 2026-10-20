import { chromium } from '../../../apps/site/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='https://www.jamloom.com', output='docs/evidence/brand-live/';
const browser=await chromium.launch();const page=await browser.newPage();page.setDefaultTimeout(20000);
const gates=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 for(const [path,title] of [['/studio/index.html','Jamloom — Your voice into music'],['/studio/dj.html','Jamloom — DJ workspace'],['/account/sign-in','Jamloom']]) {
  const response=await page.goto(base+path);assert.equal(response.status(),200);assert.equal(await page.title(),title);
  assert.match(await page.locator('.brand').innerText(),/jamloom/);assert.ok(!/djayvo/i.test(await page.locator('body').innerText()));
  gates.push({gate:'public branding',path,status:'PASS',title});
  if(path==='/studio/index.html')await page.screenshot({path:output+'studio.png',fullPage:true});
 }
 await page.waitForSelector('script[src="https://cdn.visitorping.com/site/vp_QBDH92AC.js"]',{state:'attached'});
 assert.equal(await page.locator('script[src*="cdn.visitorping.com/site/"]').count(),1);
 const config=await page.evaluate(async()=>{
  const violations=[];document.addEventListener('securitypolicyviolation',e=>violations.push({directive:e.effectiveDirective,uri:e.blockedURI}));
  const r=await fetch('https://ingest.visitorping.com/v1/config?site=vp_QBDH92AC');return{status:r.status,violations};
 });assert.equal(config.status,200);assert.deepEqual(config.violations,[]);gates.push({gate:'VisitorPing config readable under CSP',status:'PASS',httpStatus:config.status,violations:config.violations});
 const auth=await fetch(base+'/api/auth/get-session');assert.equal(auth.status,200);gates.push({gate:'auth remains available',status:'PASS'});
 const manifest=await(await fetch(base+'/studio/manifest.webmanifest')).json();assert.equal(manifest.name,'Jamloom');assert.equal(manifest.short_name,'Jamloom');assert.equal(manifest.id,'./');gates.push({gate:'PWA name and stable identity',status:'PASS'});
 await page.goto(base+'/studio/index.html');assert.equal(await page.locator('script[src*="visitorping"]').count(),0);
 const engine=await page.evaluate(async()=>{
  const {default:createEngine}=await import('/studio/engine/jamloom_web.mjs');const engine=await createEngine();
  const live=await WebAssembly.compile(await(await fetch('/studio/engine/jamloom_live.wasm')).arrayBuffer());
  return{renderExport:typeof engine._jamloom_web_render,liveExports:WebAssembly.Module.exports(live).map(e=>e.name).filter(n=>n.includes('jamloom')).length};
 });assert.equal(engine.renderExport,'function');assert.ok(engine.liveExports>0);gates.push({gate:'renamed audio modules load',status:'PASS',...engine});
 assert.deepEqual(errors,[]);
 const script=await(await fetch('https://cdn.visitorping.com/site/vp_QBDH92AC.js')).text();
 const receipt={timestamp:new Date().toISOString(),gates,errors,tracker:{paused:script.includes('tracking paused'),body:script.length<100?script:undefined},collection:'NOT RUN: no Live Radar access'};
 writeFileSync(output+'public-browser.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt);
}finally{await browser.close()}
