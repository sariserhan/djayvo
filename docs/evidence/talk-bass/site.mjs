import {chromium, webkit} from '../../../apps/web/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const evidence=[];
for(const [name, browserType] of Object.entries({chromium,webkit})) {
 const browser=await browserType.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=AudioContext;
  window.AudioContext=class extends Native {
   createAnalyser(){const a=super.createAnalyser(),connect=a.connect.bind(a);a.connect=dest=>{if(dest===this.destination){const mute=this.createGain();mute.gain.value=0;connect(mute);mute.connect(dest);return dest;}return connect(dest);};return a;}
  };
 });
 await page.goto('http://localhost:3000/studio/dj.html');
 assert.equal(await page.title(),'Djayvo — DJ workspace');
 await page.locator('#load-instruments').click();
 await page.waitForFunction(()=>document.querySelector('#instrument-status').textContent.startsWith('Ready'));
 await page.locator('#patch').selectOption('11');
 assert.equal(await page.locator('.drum-pad').count(),12);
 await page.locator('#mouth').fill('0.5');await page.locator('#mouth').dispatchEvent('input');
 assert.equal(await page.locator('#mouth-value').textContent(),'AH');
 await page.locator('#rack-echo').fill('0.4');await page.locator('#rack-echo').dispatchEvent('input');
 await page.locator('.keyboard-scroll').focus();await page.keyboard.down('a');
 await page.waitForFunction(()=>document.querySelector('#output-meter').value>.001);
 await page.keyboard.up('a');
 assert.equal(await page.locator('#rack-echo-value').textContent(),'40%');
 await page.locator('#instruments').screenshot({path:`/tmp/djayvo-talk-${name}-desktop.png`});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#instruments').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
 await page.locator('#instruments').screenshot({path:`/tmp/djayvo-talk-${name}-mobile.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#rack-fx-reset').click();assert.equal(await page.locator('#rack-echo-value').textContent(),'Off');
 assert.deepEqual(errors,[]);
 evidence.push({browser:name,version:browser.version(),url:page.url(),status:'PASS',checks:['integrated page and bank load','live talk bass and AH mouth control; 12 pads','echo control','reset','desktop/mobile rendered','no horizontal overflow or page errors']});
 await browser.close();
}
await fs.writeFile('/tmp/djayvo-talk-site.json',JSON.stringify(evidence,null,2));
