// Real pages and recording conversion; provider transport is a fixture, never paid compute.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4235',output='/tmp/jamloom-cloud-browser';assert.equal(new URL(base).hostname,'127.0.0.1');await mkdir(output,{recursive:true});
const source=Buffer.alloc(44+3*16000*2);source.write('RIFF');source.writeUInt32LE(source.length-8,4);source.write('WAVEfmt ',8);source.writeUInt32LE(16,16);source.writeUInt16LE(1,20);source.writeUInt16LE(1,22);source.writeUInt32LE(16000,24);source.writeUInt32LE(32000,28);source.writeUInt16LE(2,32);source.writeUInt16LE(16,34);source.write('data',36);source.writeUInt32LE(source.length-44,40);
for(let i=0;i<3*16000;i++)source.writeInt16LE(Math.round(2000*Math.sin(2*Math.PI*220*i/16000)),44+i*2);
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(silenceSpeakers);
  let job=null,state='queued',disconnect=false,grant,uploads=0,submits=0,deletes=0,slow=false;const bodies=[];
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.route('**/trial-upload',async r=>{const b=r.request().postDataBuffer();if(!b){assert.equal(name,'webkit');uploads++;return r.fulfill({status:200,body:''});}assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),16000);assert.equal(b.length,grant.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),grant.sha256);uploads++;await r.fulfill({status:200,body:''});});
  await context.route('**/api/improvise/song*',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(req.method()==='DELETE'){deletes++;state='cancelled';return r.fulfill({json:{state}});}
   if(req.method()==='POST'){
    const body=req.postDataJSON();
    if(body.action==='upload'){grant=body;return r.fulfill({json:{id:'a'.repeat(32),url:base+'/trial-upload'}});}
    if(body.action==='quote')return r.fulfill({json:{token:'fixture',credits:body.visibility==='private'?3:1,expiresAt:Date.now()+300000}});
    bodies.push(body);submits++;job=body.requestId;if(slow)await new Promise(resolve=>setTimeout(resolve,2000));return r.fulfill({status:202,json:{id:job,state}});
   }
   if(url.searchParams.has('view'))return r.fulfill({json:{songs:[],next:null}});
   if(url.searchParams.has('file'))return r.fulfill({contentType:'audio/wav',body:source});
   if(!url.searchParams.has('id'))return r.fulfill({json:{available:true,creditsEnabled:true,signedIn:true,mode:'cloud',active:job&&['queued','running'].includes(state)?job:undefined}});
   if(disconnect)return r.fulfill({status:503,json:{error:'temporary'}});
   return r.fulfill({json:{id:job,state,phase:state==='running'?'composing':undefined}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/improvise');
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Your sound. A new song.'})}).first();
  const choose=async()=>{await panel.getByRole('checkbox',{name:/I have permission/}).check();await panel.locator('input[type=file]').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:source});await panel.getByRole('button',{name:'Make my song',exact:true}).click();};
  await choose();assert.equal(uploads,0);await page.getByRole('checkbox',{name:/I agree to share my finished/}).check();await page.getByRole('button',{name:'Generate song · 1 credits',exact:true}).click();
  const shown=key=>page.locator(`.generation-progress[data-state="${key}"]:visible`).waitFor({timeout:20000});await shown('queued');assert.equal(submits,1);assert.equal(uploads,1);assert.equal(bodies[0].visibility,'public');assert.equal(bodies[0].publicConsent,true);
  await page.reload();await shown('queued');assert.equal(submits,1);state='running';await shown('composing');disconnect=true;await shown('reconnecting');disconnect=false;await shown('composing');
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-${width}.png`});}
  assert.deepEqual((await new AxeBuilder({page}).include('.product-controls').analyze()).violations,[]);
  state='completed';await page.getByLabel('Play your new song').waitFor();
  state='queued';job=null;await choose();await page.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();await page.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();await page.getByText(/This song needs 3 credits/).waitFor();assert.equal(submits,1);
  slow=true;await page.getByRole('button',{name:'Generate song · 3 credits',exact:true}).click();await page.waitForTimeout(300);await page.getByRole('button',{name:'Cancel',exact:true}).click();await shown('cancelled');assert.equal(submits,2);assert.equal(deletes,1);assert.equal(bodies[1].visibility,'private');assert.equal(bodies[1].publicConsent,false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:name,status:'PASS',uploadVerified:true,publicConsent:true,priceConfirmation:true,refresh:true,reconnect:true,cancelDuringSubmit:true,private:true,mobile:true,accessibility:true}));
  let dnaId=null,dnaAccepted=false,dnaCancelled=false,dnaSubmits=0;
  await context.route('**/api/taste/song*',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(url.searchParams.has('view'))return r.fulfill({json:{songs:[],next:null}});
   if(req.method()==='POST'){
    const body=req.postDataJSON();if(body.action==='quote')return r.fulfill({json:{credits:2,token:'fixture',expiresAt:Date.now()+300000}});
    dnaId=body.requestId;dnaSubmits++;await new Promise(resolve=>setTimeout(resolve,3000));dnaAccepted=true;return r.abort();
   }
   if(req.method()==='DELETE'){dnaCancelled=true;return r.fulfill({json:{state:'cancelled'}});}
   if(!url.searchParams.has('id'))return r.fulfill({json:{mode:'cloud',creditsEnabled:true,signedIn:true,active:dnaAccepted&&!dnaCancelled?dnaId:null}});
   if(!dnaAccepted)return r.fulfill({status:404,json:{error:'Not yet accepted'}});
   return r.fulfill({json:{id:dnaId,state:dnaCancelled?'cancelled':'queued'}});
  });
  await page.evaluate(()=>localStorage.setItem('jamloom-taste-v1',JSON.stringify({version:1,references:['Test favorite'],referenceMetadata:[{reference:'Test favorite',genre:'Pop',source:'itunes',id:1}],vocalLanguage:'en',energy:'balanced',tempo:100,instruments:['piano'],novelty:50})));
  await page.goto(base+'/music-dna');await page.getByRole('button',{name:'Make my music',exact:true}).click();await page.getByRole('radio',{name:'Private · from 2 credits',exact:true}).check();await page.getByRole('button',{name:'Generate song · 2 credits',exact:true}).click();
  await shown('reconnecting');await page.getByRole('button',{name:'Cancel composition',exact:true}).click();await page.reload();await shown('cancelled');assert.equal(dnaSubmits,1);assert.equal(dnaCancelled,true);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:name,status:'PASS',dnaLostSubmitResponse:true,dnaEarly404:true,dnaCancelSurvivesRefresh:true,noDuplicateSubmit:true}));
 }finally{await browser.close();}
}
