import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {_electron} from '../../web/node_modules/playwright/index.mjs';
const require=createRequire(import.meta.url),here=fileURLToPath(new URL('../',import.meta.url));
const output=await fs.mkdtemp(path.resolve(here,'../../renders/pro-desktop-'));
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'jamloom-pro-test-'));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const checks=[],errors=[];let app,page;
const check=name=>{checks.push(name);console.log('PASS',name);};
function tone(seconds=8){const rate=48000,n=rate*seconds,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*2*Math.PI*220/rate)*8000,44+i*2);return {name:'cleared-test-tone.wav',mimeType:'audio/wav',buffer:b};}
async function launch(){
 app=await _electron.launch({executablePath:process.env.JAMLOOM_PRO_EXECUTABLE||require('electron'),args:[...(process.env.JAMLOOM_PRO_EXECUTABLE?[]:[here]),'--user-data-dir='+profile,'--use-fake-device-for-media-stream'],env});
 page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.webContents.setAudioMuted(true);});
 page.setDefaultTimeout(15000);
 await page.waitForSelector('#sample-pad-7',{state:'attached'});
 await page.locator('#music-rights').check();
}
async function reveal(){await page.locator('details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));}
async function set(id,value){await page.locator(id).fill(String(value));await page.locator(id).dispatchEvent('input');}
try{
 await launch();
 assert.deepEqual(await page.evaluate(()=>({secure:isSecureContext,node:typeof require,midi:typeof navigator.requestMIDIAccess,sink:typeof AudioContext.prototype.setSinkId})),{secure:true,node:'undefined',midi:'function',sink:'function'});
 assert.equal(await page.locator('#play-a').isDisabled(),true);
 if(!process.env.JAMLOOM_PRO_EXECUTABLE)assert.equal(await page.evaluate(()=>window.jamloomDesktop.checkUpdates()),'Updates are available in signed releases. This is a local Pro preview.');
 assert.match(await page.evaluate(async()=>await (await fetch('/electron-license.txt')).text()),/Electron/);
 check('sandboxed desktop loads the shared secure studio, starts stopped and supports MIDI/output APIs');
 await app.evaluate(({dialog})=>{globalThis.savedDialog=dialog.showMessageBox;dialog.showMessageBox=async()=>({response:0,checkboxChecked:false});});
 assert.equal(await page.evaluate(async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop());return 'unexpected capture';}catch(error){return error.name;}}),'NotAllowedError');
 assert.equal(await page.evaluate(async()=>{try{await navigator.requestMIDIAccess({sysex:false});return 'unexpected grant';}catch(error){return error.name;}}),'NotAllowedError');
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
 assert.equal(await page.evaluate(async()=>{const access=await navigator.requestMIDIAccess({sysex:false});return access.sysexEnabled;}),false);
 await app.evaluate(({dialog})=>{dialog.showMessageBox=globalThis.savedDialog;delete globalThis.savedDialog;});
 check('actual permission boundary rejects microphone capture and opens MIDI only after approval, without sysex');
 await page.locator('#file-a').setInputFiles(tone());await page.waitForFunction(()=>!document.querySelector('#play-a').disabled);
 await page.locator('#file-b').setInputFiles(tone());await page.waitForFunction(()=>!document.querySelector('#play-b').disabled);
 await page.locator('#play-a').click();await page.waitForFunction(()=>document.querySelector('#audio-a').currentTime>.1);
 const rotation=await page.locator('#vinyl-a').getAttribute('style');await page.waitForFunction(previous=>document.querySelector('#vinyl-a').getAttribute('style')!==previous,rotation);
 await page.locator('#play-b').click();await page.waitForFunction(()=>document.querySelector('#audio-b').currentTime>.1);
 await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
 await page.waitForTimeout(600);assert.match(await page.evaluate(()=>window.jamloomDesktop.checkUpdates()),/Pause playback/);
 const knob=page.locator('#eq-a-0');await knob.focus();await page.keyboard.press('ArrowUp');assert.equal(await knob.inputValue(),'1');
 const box=await knob.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-35,{steps:6});await page.mouse.up();assert.ok(Number(await knob.inputValue())>1);
 await page.locator('#pause-all').click();
 check('two local tracks play, measured signal and platters advance, rotary EQ works and active sets block updates');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'console.png'),fullPage:false});
 await reveal();await page.locator('#prepare-frames-a').click();await page.waitForFunction(()=>document.querySelector('#prepare-frames-a').disabled&&!document.querySelector('#beat-loop-a').disabled);
 await page.locator('#bpm-a').fill('120');await page.locator('#play-a').click();await page.locator('#loop-beats-a').selectOption('1');await page.locator('#beat-loop-a').click();await page.waitForTimeout(200);await page.locator('#loop-exit-a').click();await page.locator('#pause-all').click();
 check('bundled AudioWorklet beat playback and looping work offline in desktop');
 await page.locator('#sample-consent').check();await page.locator('#sample-file').setInputFiles(tone(2));await page.waitForFunction(()=>!document.querySelector('#sample-start').disabled);
 await page.locator('#sample-end').fill('1');await page.locator('#sample-end').dispatchEvent('change');await page.locator('#sample-loop').check();
 await page.locator('#sample-pad-0').click();await page.waitForFunction(()=>document.querySelector('#sample-pad-0').dataset.playing==='true');
 await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
 await page.locator('#sample-stop').click();await page.locator('#sample-store-consent').check();await page.locator('#sample-save').click();await page.waitForFunction(()=>document.querySelector('#sampler-status').textContent.includes('saved on this device'));
 await page.locator('#sample-clear').click();await page.locator('#sample-restore').click();await page.waitForFunction(()=>document.querySelector('#sampler-status').textContent.includes('restored'));
 assert.equal(await page.locator('#sample-end').inputValue(),'1');assert.ok(await page.locator('#sample-loop').isChecked());
 check('sampler trim, looping, measured PCM, clear, atomic bank save and stopped restore');
 await page.locator('#mix-record-consent').check();await page.locator('#mix-record-start').click();await page.waitForFunction(()=>!document.querySelector('#mix-record-stop').disabled);
 await page.locator('#sample-pad-0').click();await page.waitForTimeout(350);await page.locator('#sample-stop').click();await page.locator('#mix-record-stop').click();await page.waitForFunction(()=>!document.querySelector('#mix-record-wav').hidden);
 await app.evaluate(({session},dir)=>{session.defaultSession.on('will-download',(_event,item)=>item.setSavePath(dir+'/'+item.getFilename()));},output);
 await page.locator('#mix-record-wav').click();await page.waitForTimeout(500);
 const files=await fs.readdir(output),wav=files.find(name=>name.endsWith('.wav'));assert.ok(wav);const bytes=await fs.readFile(path.join(output,wav));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length>1000);
 await page.waitForFunction(()=>!document.querySelector('#mix-record-sources').hidden);
 const inventory=await page.locator('#mix-record-sources').evaluate(async node=>(await fetch(node.href)).json());assert.ok(inventory.assets.some(asset=>asset.kind==='sampler_audio'));
 check('native download exports actual recorded WAV with sampler source fingerprints');
 await page.locator('#sample-loop').uncheck();await page.locator('#sample-save').click();await page.waitForFunction(()=>document.querySelector('#sampler-status').textContent.includes('saved on this device'));
 await page.evaluate(()=>window.jamloomDesktop.saveSettings({catalogue:false,automaticUpdates:false}));
 const prefsPromise=app.waitForEvent('window');await page.evaluate(()=>window.jamloomDesktop.openSettings());const prefs=await prefsPromise;await prefs.waitForSelector('#catalogue');assert.equal(await prefs.locator('#catalogue').isChecked(),false);await prefs.screenshot({path:path.join(output,'settings.png')});
 await app.evaluate(({app})=>app.exit(0));app=null;
 await launch();await reveal();await page.locator('#sample-consent').check();await page.locator('#sample-restore').click();await page.waitForFunction(()=>document.querySelector('#sampler-status').textContent.includes('restored'));
 assert.equal(await page.locator('#sample-pad-0').getAttribute('data-playing'),'false');assert.equal(await page.locator('#sample-end').inputValue(),'1');assert.equal((await page.evaluate(()=>window.jamloomDesktop.settings())).catalogue,false);
 check('real app relaunch retains local bank and settings without restarting sound');
 assert.equal(await page.evaluate(async()=>(await fetch('/api/aurowall')).status),503);
 await page.evaluate(()=>window.jamloomDesktop.saveSettings({catalogue:true,automaticUpdates:false}));
 await app.evaluate((_electron,bytes)=>{const audio=Buffer.from(bytes);globalThis.fetch=async url=>new Response(String(url).endsWith('/api/aurowall')?JSON.stringify({tracks:[{id:'a'.repeat(24),title:'Authorized fixture',artist:'Aurowall',genre:'Edm',bytes:audio.length,url:'/api/aurowall/'+'a'.repeat(24)}]}):audio,{headers:{'Content-Type':String(url).endsWith('/api/aurowall')?'application/json':'audio/mpeg'}});},[...tone(2).buffer]);
 await page.reload();await reveal();await page.locator('#music-rights').check();await page.waitForFunction(()=>[...document.querySelector('#practice-track').options].some(o=>o.value==='a'.repeat(24)));
 await page.locator('#practice-track').selectOption('a'.repeat(24));await page.locator('#practice-load-a').click();await page.waitForFunction(()=>!document.querySelector('#play-a').disabled);
 assert.match(await page.locator('#name-a').textContent(),/Aurowall/);
 await page.locator('#remember-set').check();await page.locator('#recovery-save').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('online only'));
 check('bounded Aurowall proxy loads a partner fixture and preserves the online-only storage rule; Settings can disable it');
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',checks,errors,hardware:'NOT RUN',publicRelease:'NOT RUN'},null,2));console.log('Evidence:',output);
}catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({message:error.message,stack:error.stack,checks,errors},null,2));console.error('Evidence:',output);throw error;}
finally{if(app)await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}
