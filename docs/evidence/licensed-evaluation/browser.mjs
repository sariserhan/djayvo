import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(process.cwd()+'/apps/web/package.json')('playwright');
const root='renders/licensed-evaluation-validated-20261018';
const freeze=JSON.parse(await fs.readFile(root+'/freeze.json','utf8'));
const clip=freeze.dataset.clips.find(c=>c.source_kind==='recorded');assert(clip);
const block={clip_id:clip.id,seed:freeze.seeds[0]};
const folder=`${root}/${block.clip_id}/${block.seed}/blinded/listener`;
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(process.cwd()+'/'+folder+'/index.html').href);
  assert.equal(await page.locator('audio').count(),5);
  assert.equal(await page.locator('a[href="ATTRIBUTION.txt"]').count(),1);
  assert(!(await page.locator('body').innerText()).match(/hiphop|reggae|experimental|baseline|organizer-key/));
  const players=await page.evaluate(async()=>{
   const rows=[];
   for(const a of document.querySelectorAll('audio')){
    a.muted=true;await a.play();
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('seek timeout')),5000);a.onseeked=()=>{clearTimeout(t);resolve()};a.currentTime=a.duration/2;});
    if([...document.querySelectorAll('audio')].filter(p=>!p.paused).length!==1)throw Error('overlapping players');
    rows.push({label:a.getAttribute('aria-label'),duration:a.duration,seek:a.currentTime});a.pause();
   }
   return rows;
  });
  assert(players[0].duration>=2&&players[0].duration<=5);
  assert(players.slice(1).every(p=>p.duration>=20&&p.duration<=40));assert.deepEqual(errors,[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:`/tmp/djayvo-blind-review-${name}.png`});
  results.push({browser:name,version:browser.version(),status:'PASS',players,errors,viewport:'390x844',listening:'NOT RUN'});
 }finally{await browser.close()}
}
await fs.writeFile('docs/evidence/licensed-evaluation/browser.json',JSON.stringify(results,null,2)+'\n');
console.log('PASS: two mobile-width browser checks, five anonymous players, play/seek and credits; listening NOT RUN');
