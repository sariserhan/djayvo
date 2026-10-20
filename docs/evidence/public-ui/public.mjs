import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,webkit} from '../../../apps/site/node_modules/playwright/index.mjs';
const output=await fs.mkdtemp(new URL('../../../renders/public-ui-live-',import.meta.url).pathname);
const base='https://www.jamloom.com', report={timestamp:new Date().toISOString(),gates:[],errors:[]};
console.log('Artifacts:',output);
for(const [name,engine,width,height] of [['chromium',chromium,1440,1000],['webkit',webkit,390,844]]) {
  const browser=await engine.launch();
  try {
    const page=await browser.newPage({viewport:{width,height}});
    page.on('pageerror',e=>report.errors.push({browser:name,message:e.message}));
    for(const [route,label] of [['/studio/index.html','studio'],['/studio/dj.html','dj'],['/account/sign-in','account'],['/catalogue','catalogue']]) {
      const response=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);
      assert.match(await page.title(),/Jamloom/);
      assert.equal(await page.locator('.brand img').count(),1);
      assert.ok(!/djayvo/i.test(await page.locator('body').innerText()));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.ok(await page.locator('select').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=48&&getComputedStyle(e).appearance==='none')));
      if(label==='studio') {
        await page.locator('.studio-intro').waitFor();
        await page.locator('#privacy-open').focus();await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');await page.locator('#privacy').waitFor({state:'hidden'});
        assert.ok(await page.locator('#record').isDisabled());await page.locator('#consent').check();
        assert.ok(await page.locator('#record').isEnabled());await page.locator('#consent').uncheck();
        assert.equal(await page.locator('script[src*="visitorping"]').count(),0);
      }
      await page.screenshot({path:`${output}/${name}-${label}.png`,fullPage:label!=='dj'});
      report.gates.push({browser:name,route,width,height,status:'PASS'});
    }
  }finally{await browser.close();}
}
assert.equal((await fetch(base+'/api/auth/get-session')).status,200);
assert.equal(new URL((await fetch('https://jamloom.com',{redirect:'manual'})).headers.get('location')).origin,base);
assert.deepEqual(report.errors,[]);
report.gates.push({gate:'Live auth endpoint and apex redirect',status:'PASS'});
await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
