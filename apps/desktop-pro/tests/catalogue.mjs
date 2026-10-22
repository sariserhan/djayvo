import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {_electron} from '../../web/node_modules/playwright/index.mjs';
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'jamloom-pro-catalogue-'));
const out=new URL('../../../renders/pro-catalogue/',import.meta.url);await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(profile,'pro.license'),await fs.readFile(process.env.JAMLOOM_PRO_LICENSE_FILE),{mode:0o600});
await fs.writeFile(path.join(profile,'settings.json'),JSON.stringify({catalogue:true,automaticUpdates:false}));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;let app;
try{
 app=await _electron.launch({executablePath:process.env.JAMLOOM_PRO_EXECUTABLE,args:['--user-data-dir='+profile],env});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.setAudioMuted(true)));
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.waitForSelector('#sample-pad-7',{state:'attached'});
 await page.waitForFunction(()=>document.querySelector('#aurowall-status').textContent.includes('tracks available online.'));
 await page.locator('#saved-mixes > details').evaluate(el=>el.open=true);await page.locator('#music-rights').check();
 const track=await page.locator('#practice-track option').evaluateAll(nodes=>nodes.find(n=>/^[a-f0-9]{24}$/.test(n.value))?.value);assert.ok(track);
 await page.locator('#practice-track').selectOption(track);await page.locator('#practice-load-a').click();await page.waitForFunction(()=>!document.querySelector('#play-a').disabled);
 assert.match(await page.locator('#name-a').textContent(),/Aurowall/);await page.locator('#play-a').click();
 await page.waitForFunction(()=>document.querySelector('#audio-a').currentTime>5&&document.querySelector('#output-meter').value>.001);
 const sample=await page.evaluate(()=>({time:document.querySelector('#audio-a').currentTime,peak:Number(document.querySelector('#output-meter').value),catalogue:document.querySelector('#aurowall-status').textContent}));
 await page.locator('#pause-all').click();assert.deepEqual(errors,[]);
 const settings=await page.evaluate(()=>window.jamloomDesktop.settings());assert.equal(settings.licensed,true);
 await fs.writeFile(new URL('report.json',out),JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),version:settings.version,track,sample,errors,scope:'Signed installed Mac app; actual production license renewal, Aurowall catalogue, full track download and measured PCM',physicalOutput:'muted'},null,2));console.log('PASS signed app plays actual production Aurowall audio with muted physical output');
}finally{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}
