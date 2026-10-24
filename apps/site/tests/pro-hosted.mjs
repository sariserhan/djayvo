import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {verifyLicense} from '../../desktop-pro/license.mjs';

// Read-only production smoke: never create an account, purchase or charge.
const origin='https://www.jamloom.com',checks=[];
const token=(await fs.readFile(process.env.JAMLOOM_PRO_LICENSE_FILE,'utf8')).trim();
assert.ok(verifyLicense(token)&&!verifyLicense(token).sandbox,'Use a current owner activation file');
const request=(path,options={})=>fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(45000),...options});
for(const path of ['/pro','/download','/pricing','/live-dj']){
 const r=await request(path);assert.equal(r.status,200,path);const html=await r.text();
 assert.ok(html.includes('Jamloom'),path);if(path==='/pro')assert.ok(html.includes('$49 once')&&html.includes('pro-v1.1.0/Jamloom-Pro-1.1.0-macOS.zip'));
 checks.push({path,status:r.status});
}
const deck=await request('/studio/dj.html');assert.equal(deck.status,200);assert.equal(deck.headers.has('X-Jamloom-Pro-Expires'),false);assert.ok((await deck.text()).includes('studio-access'));checks.push({check:'Public studio without paid entitlement',status:'PASS'});
assert.equal((await request('/api/aurowall')).status,403);
assert.equal((await request('/api/pro/refresh',{method:'POST'})).status,401);
const headers={Authorization:'Bearer '+token};
const renewal=await request('/api/pro/refresh',{method:'POST',headers});assert.equal(renewal.status,200);assert.match(renewal.headers.get('cache-control'),/no-store/);
const renewed=verifyLicense((await renewal.json()).license);assert.ok(renewed&&!renewed.sandbox&&renewed.subject===verifyLicense(token).subject);checks.push({check:'Production signed license renewal',status:'PASS'});
const catalogue=await request('/api/aurowall',{headers});assert.equal(catalogue.status,200);assert.match(catalogue.headers.get('cache-control'),/no-store/);
const {tracks}=await catalogue.json();assert.ok(tracks.length>0);assert.ok(tracks.every(t=>!('key'in t)&&!('etag'in t)));
const path=tracks[0].url;assert.match(path,/^\/api\/aurowall\/[a-f0-9]{24}$/);
assert.equal((await request(path)).status,403);
const audio=await request(path,{headers:{...headers,Range:'bytes=0-65535'}});assert.equal(audio.status,206);assert.equal(audio.headers.get('content-type'),'audio/mpeg');assert.match(audio.headers.get('cache-control'),/no-store/);
const bytes=(await audio.arrayBuffer()).byteLength;assert.ok(bytes>0&&bytes<=65536);checks.push({check:'Authorized production catalogue and ranged audio',status:'PASS',tracks:tracks.length,bytes});
for(const mode of ['test','live'])assert.equal((await request('/api/pro/stripe?mode='+mode,{method:'POST',body:'{}'})).status,400);
checks.push({check:'Unsigned webhooks rejected in both modes',status:'PASS'});
const report={status:'PASS',checkedAt:new Date().toISOString(),origin,checks,livePayment:'NOT RUN; no charge made',physicalAudio:'NOT RUN; HTTP checks only'};
await fs.mkdir('../../renders/pro-hosted',{recursive:true});await fs.writeFile('../../renders/pro-hosted/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
