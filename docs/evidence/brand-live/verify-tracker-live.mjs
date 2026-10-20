import {chromium} from '../../../apps/site/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const page=await browser.newPage();const events=[],errors=[],connections=[];
page.on('response',r=>{
 if(!r.url().startsWith('https://ingest.visitorping.com/e/'))return;
 try{const b=r.request().postDataJSON();events.push({event:b.event,path:b.path,siteKey:b.siteId,httpStatus:r.status()})}catch{}
});
page.on('console',m=>{if(m.type()==='error')errors.push(m.text().replace(/sessionId=[^&'\s]+/g,'sessionId=REDACTED'))});
const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');
cdp.on('Network.webSocketHandshakeResponseReceived',e=>connections.push({status:e.response.status}));
try{
 await page.addInitScript(()=>{window.vpCspViolations=[];document.addEventListener('securitypolicyviolation',e=>window.vpCspViolations.push({directive:e.effectiveDirective,origin:new URL(e.blockedURI).origin}))});
 await page.goto('https://www.jamloom.com/account/sign-in');await page.waitForLoadState('networkidle');
 await page.getByRole('link',{name:'Music',exact:true}).click();await page.waitForURL('**/catalogue');await page.waitForLoadState('networkidle');
 for(let attempt=0;attempt<20 && (!connections.length||events.filter(e=>e.event==='page_view').length<2);attempt++)await page.waitForTimeout(250);
 const violations=await page.evaluate(()=>window.vpCspViolations);
 const result={timestamp:new Date().toISOString(),events,connections,errors,violations,liveRadar:'NOT RUN: authenticated dashboard unavailable'};
 writeFileSync('docs/evidence/brand-live/tracker-events.json',JSON.stringify(result,null,2)+'\n');console.log(result);
 assert.equal(events.filter(e=>e.event==='page_view'&&e.httpStatus===204).length,2);assert.ok(connections.some(e=>e.status===101));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
}finally{await browser.close()}
