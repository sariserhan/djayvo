import assert from 'node:assert/strict';
import {chromium,webkit} from '../../../apps/site/node_modules/playwright/index.mjs';
import AxeBuilder from '../../../apps/site/node_modules/@axe-core/playwright/dist/index.mjs';
import {silenceSpeakers} from '../../../apps/site/tests/silent-audio.mjs';

for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
  try{
    const context=await browser.newContext();const page=await context.newPage();
    await page.addInitScript(silenceSpeakers);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4249/reggae-revision/');
    assert.equal(await page.locator('article').count(),5);
    const players=page.locator('audio');assert.equal(await players.count(),24);
    assert(await players.evaluateAll(nodes=>nodes.every(a=>a.paused&&a.preload==='none')));
    for(let i=0;i<await players.count();i++){
      await players.nth(i).evaluate(a=>a.play());
      await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.03,i);
      assert(await players.nth(i).evaluate(a=>a.muted&&Number.isFinite(a.duration)&&a.duration>0));
      assert(await players.evaluateAll(nodes=>nodes.filter(a=>!a.paused).length===1));
    }
    await players.evaluateAll(nodes=>nodes.forEach(a=>a.pause()));
    await page.locator('summary').first().click();assert.equal(await page.locator('details[open]').count(),1);
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:`renders/improvise-reggae-revision-20261023/${name}-${width}.png`});
    }
    assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations,[]);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({browser:name,status:'PASS',mutedPlayers:24,singlePlayer:true,accessibility:true,noOverflow:true,errors}));
  }finally{await browser.close();}
}
