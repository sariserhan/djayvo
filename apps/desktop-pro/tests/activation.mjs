import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createPrivateKey,sign} from 'node:crypto';
import {_electron} from '../../web/node_modules/playwright/index.mjs';
import {verifyLicense,LEASE_SECONDS} from '../license.mjs';
assert.ok(process.env.JAMLOOM_PRO_EXECUTABLE,'Use a packaged app');
const token=process.env.JAMLOOM_PRO_TEST_LICENSE;assert.ok(verifyLicense(token)&&!verifyLicense(token).sandbox,'Verified owner activation required');
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'jamloom-pro-license-')),output=await fs.mkdtemp(path.resolve('renders/pro-activation-'));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.JAMLOOM_PRO_TEST_LICENSE;delete env.PRO_LICENSE_PRIVATE_KEY;
const checks=[];let app,page;
async function launch(){app=await _electron.launch({executablePath:process.env.JAMLOOM_PRO_EXECUTABLE,args:['--user-data-dir='+profile],env});page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.setAudioMuted(true)));page.setDefaultTimeout(15000);}
async function activate(value){const file=path.join(profile,'test.license');await fs.writeFile(file,value,{mode:0o600});await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);return page.evaluate(()=>window.jamloomDesktop.activate());}
try{
 await launch();await page.waitForSelector('#activate');assert.equal((await page.evaluate(()=>window.jamloomDesktop.settings())).licensed,false);await page.goto('jamloom://studio/dj.html');await page.waitForSelector('#activate');assert.equal(await page.locator('#open-studio').isDisabled(),true);checks.push('Unlicensed packaged app stays in activation settings');
 assert.match(await activate('invalid'),/invalid/);
 const payload=verifyLicense(token),key=createPrivateKey(Buffer.from(process.env.PRO_LICENSE_PRIVATE_KEY,'base64'));
 const signed=value=>{const body=Buffer.from(JSON.stringify(value));return body.toString('base64url')+'.'+sign(null,body,key).toString('base64url');};
 assert.match(await activate(signed({...payload,sandbox:true})),/invalid/);
 assert.match(await activate(signed({...payload,issued:payload.issued-LEASE_SECONDS,expires:payload.expires-LEASE_SECONDS})),/invalid/);
 assert.match(await activate(token.slice(0,-4)+'AAAA'),/invalid/);checks.push('Invalid, tampered, expired and sandbox activation files rejected');
 assert.match(await activate(token),/activated/);assert.equal((await fs.stat(path.join(profile,'pro.license'))).mode&0o777,0o600);await page.locator('#open-studio').click();await page.waitForSelector('#sample-pad-7',{state:'attached'});checks.push('Valid signed owner license opens the full studio and is stored privately');
 await app.evaluate(()=>{globalThis.fetch=async()=>new Response(null,{status:503});});await page.evaluate(()=>window.jamloomDesktop.renewLicense());assert.equal((await page.evaluate(()=>window.jamloomDesktop.settings())).licensed,true);checks.push('Provider outage preserves valid offline access');
 await page.evaluate(()=>window.jamloomDesktop.saveSettings({catalogue:false,automaticUpdates:false}));await app.evaluate(({app})=>app.exit(0));app=null;await launch();await page.waitForSelector('#sample-pad-7',{state:'attached'});assert.equal((await page.evaluate(()=>window.jamloomDesktop.settings())).licensed,true);checks.push('Packaged relaunch retains activation and opens stopped');
 await app.evaluate(()=>{globalThis.fetch=async()=>new Response(null,{status:403});});await page.evaluate(()=>window.jamloomDesktop.renewLicense());assert.equal((await page.evaluate(()=>window.jamloomDesktop.settings())).licensed,false);await assert.rejects(fs.stat(path.join(profile,'pro.license')));await page.reload();await page.waitForSelector('#activate');checks.push('Confirmed revoked access removes renewal file and returns to activation on reopen');
 await page.screenshot({path:path.join(output,'activation.png')});await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',checks,hardware:'NOT RUN'},null,2));console.log('PASS',output);
}catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:error.message,checks},null,2));throw error;}finally{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
