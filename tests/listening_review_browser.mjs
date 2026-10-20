// All filled responses are temporary synthetic UI fixtures, never study observations.
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium,webkit } from '../apps/site/node_modules/playwright/index.mjs';
const root=resolve(import.meta.dirname,'..'),temp=await mkdtemp(join(tmpdir(),'jamloom-review-ui-test-'));
const evidence=await mkdtemp(join(root,'renders/listening-ui-browser-'));console.log('Evidence: '+evidence);
execFileSync('python3',['-c',`import sys;from pathlib import Path;sys.path.insert(0,'tests/integration');from verify_listening_review import fixture;from prepare_listening_review import build_review;p=Path(sys.argv[1]);fixture(p/'batch');build_review(p/'batch','synthetic-ui-fixture',4123,p/'packet')`,temp],{cwd:root});
const server=createServer(async(request,response)=>{
  try{
    const name=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1)||'index.html';
    if(!/^[a-zA-Z0-9_.-]+$/.test(name)||name==='..')throw new Error();
    const data=await readFile(join(temp,'packet',name));
    response.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wav':'audio/wav','.json':'application/json'})[extname(name)]||'text/plain','Cache-Control':'no-store','Content-Length':String(data.length)});response.end(data);
  }catch{response.writeHead(404);response.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
try{
  for(const [kind,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
    page.setDefaultTimeout(15_000);page.setDefaultNavigationTimeout(15_000);
    const errors=[],consoleErrors=[],external=[],checks=[],warnings=[];let capturing=false,downloads=0;
    const check=name=>{checks.push({name,status:'PASS'});console.log(kind+' PASS: '+name);};
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){if(kind==='webkit'&&capturing&&m.text().startsWith('Refused to apply a stylesheet because its hash, its nonce,'))warnings.push(m.text());else consoleErrors.push(m.text());}});
    page.on('request',r=>{if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:'))external.push(r.url());});page.on('download',()=>downloads++);
    async function shot(name){capturing=true;try{await page.screenshot({path:join(evidence,kind+'-'+name+'.png'),fullPage:false,caret:'initial'});}finally{capturing=false;}}
    try{
      await page.goto(base);assert.equal(await page.title(),'Jamloom blinded listening review');await page.getByRole('heading',{name:'Listen. Compare. Tell us what you hear.'}).waitFor();
      assert.equal(await page.locator('audio').count(),5);assert.equal(await page.locator('select').count(),31);
      assert.ok((await page.locator('select').evaluateAll(nodes=>nodes.map(n=>n.value))).every(v=>v===''));
      assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.match(await page.locator('body').innerText(),/owner-only listening/);
      await page.getByRole('button',{name:'Download ratings',exact:true}).click();assert.equal(downloads,0);assert.equal(await page.locator('form').evaluate(f=>f.checkValidity()),false);
      check('correct page, five anonymous players, blank judgments, permission scope and incomplete-export denial');
      await page.locator('audio').evaluateAll(nodes=>nodes.forEach(a=>a.muted=true));
      const source=page.getByLabel('Source',{exact:true}),candidate=page.getByLabel('Candidate A',{exact:true});
      await source.evaluate(a=>a.play());await candidate.evaluate(a=>a.play());assert.equal(await source.evaluate(a=>a.paused),true);await candidate.evaluate(a=>a.pause());
      check('source/candidate playback works and starting another player pauses the first; muted automation only');
      await shot('desktop');await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile');
      check('desktop/mobile controls render without horizontal overflow');
      await page.getByLabel('Reviewer code',{exact:true}).fill('../invalid');assert.equal(await page.getByLabel('Reviewer code',{exact:true}).evaluate(n=>n.checkValidity()),false);
      await page.getByLabel('Reviewer code',{exact:true}).fill('UI_FIXTURE_ONLY');
      for(const letter of 'ABCD'){
        const group=page.getByRole('group',{name:'Candidate '+letter,exact:true});
        for(const label of ['Recognizable source','Would you share it?'])await group.getByLabel(label,{exact:true}).selectOption('no');
        await group.getByLabel('Technical failure or glitch?',{exact:true}).selectOption('yes');
        for(const label of ['Groove','Coherence','Originality','Enjoyment'])await group.getByLabel(label,{exact:true}).selectOption('1');
        await group.getByLabel('Notes for candidate '+letter,{exact:true}).fill('Synthetic UI test only, not a listener.\nQuoted "line" café');
      }
      await page.getByLabel('Notes for candidate A',{exact:true}).fill('=UI_FIXTURE_ONLY');
      for(let i=1;i<=3;i++)await page.getByRole('group',{name:'Comparison '+i,exact:true}).getByLabel('Which do you prefer?',{exact:true}).selectOption('tie');
      await page.getByRole('checkbox').check();assert.equal(await page.locator('form').evaluate(f=>f.checkValidity()),true);
      const ratingDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download ratings',exact:true}).click();await (await ratingDownload).saveAs(join(temp,'ratings.csv'));
      await page.getByRole('status').filter({hasText:'Download the other file'}).waitFor();
      const pairDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download comparisons',exact:true}).click();await (await pairDownload).saveAs(join(temp,'pairs.csv'));
      await page.getByRole('status').filter({hasText:'Both files prepared'}).waitFor();assert.equal(downloads,2);
      execFileSync('python3',['-c',`import sys,csv;from pathlib import Path;sys.path.insert(0,'scripts');from summarize_listening import summarize;p=Path(sys.argv[1]);r=summarize(p/'batch',[p/'ratings.csv'],[p/'pairs.csv']);assert r['individual_ratings']==4 and r['individual_pairs']==3;assert r['formal_quality']=='NOT RUN';rows=list(csv.DictReader((p/'ratings.csv').open(encoding='utf-8-sig',newline='')));assert rows[0]['notes']=="'=UI_FIXTURE_ONLY";assert rows[1]['notes']=='Synthetic UI test only, not a listener.\\nQuoted "line" café'`,temp],{cwd:root});
      check('complete synthetic form exports two valid CSVs; quoted Unicode/newlines survive, spreadsheet formulas are escaped, M1 stays NOT RUN');
      await page.reload();assert.equal(await page.getByLabel('Reviewer code',{exact:true}).inputValue(),'');assert.ok((await page.locator('select').evaluateAll(ns=>ns.map(n=>n.value))).every(v=>v===''));
      assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
      assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
      check('reload is blank; no browser persistence, external requests, page errors or unexpected console errors');
      await writeFile(join(evidence,kind+'.json'),JSON.stringify({status:'PASS',browser:kind,version:browser.version(),node:process.version,checks,errors,consoleErrors,warnings,external,human_listening:'NOT RUN',responses:'Temporary synthetic test only; deleted after validation'},null,2));
    }catch(error){await shot('failure').catch(()=>{});console.error({errors,consoleErrors});throw error;}finally{await context.close();await browser.close();}
  }
}finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
