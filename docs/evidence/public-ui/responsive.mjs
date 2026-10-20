import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium, webkit} from '../../../apps/site/node_modules/playwright/index.mjs';
const output = await fs.mkdtemp(new URL('../../../renders/public-ui-',import.meta.url).pathname);
console.log('Artifacts:',output);
const base = process.env.UI_URL || 'http://127.0.0.1:4300';
const report = {base, checks:[], errors:[]};
for (const [name, engine] of Object.entries({chromium,webkit})) {
  const browser = await engine.launch();
  const context = await browser.newContext();
  // Local design checks never send analytics visits.
  if (base.includes('127.0.0.1')) await context.route('https://cdn.visitorping.com/**', route => route.fulfill({contentType:'application/javascript',body:'/* local visual check */'}));
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(`${name}: ${e.message}`));
  for (const [width,height] of [[320,740],[390,844],[768,1024],[1024,768],[1440,1000],[1920,1080],[900,480]]) {
    await page.setViewportSize({width,height});
    for (const route of ['/studio/index.html','/studio/dj.html','/account/sign-in','/catalogue']) {
      const response=await page.goto(base+route,{waitUntil:'networkidle'}); assert.equal(response.status(),200);
      await page.locator('h1').waitFor();
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(dimensions.scroll <= width+1, `${name} ${route} ${width} overflow ${dimensions.scroll}`);
      assert.ok(await page.locator('select').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=48&&getComputedStyle(e).appearance==='none')));
      report.checks.push({browser:name,route,width,height,status:'PASS'});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/studio/index.html',{waitUntil:'networkidle'});
  assert.ok(await page.locator('#record').isDisabled());
  await page.locator('#privacy-open').focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#privacy').isVisible());
  await page.keyboard.press('Escape');
  await page.locator('#privacy').waitFor({state:'hidden'});
  assert.ok(await page.locator('#privacy-open').evaluate(e=>e===document.activeElement));
  await page.locator('#consent').check();
  assert.ok(await page.locator('#import').isEnabled());
  await page.locator('input[value="club"]').check();
  assert.ok(await page.locator('input[value="club"]').isChecked());
  await page.locator('#file').setInputFiles(new URL('../../../renders/fixtures/synthetic-speech.wav',import.meta.url).pathname);
  await page.locator('#trim:not([hidden])').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
  assert.ok(await page.locator('#import').evaluate(e=>e.getBoundingClientRect().height<=50));
  await page.screenshot({path:`${output}/${name}-mobile-ready.png`,fullPage:true});
  await page.locator('#clear-source').click();
  assert.ok(await page.locator('#generate').isDisabled());
  await page.goto(base+'/account/sign-up',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  assert.equal(await page.locator('input[name="name"]').evaluate(e=>e.validity.valueMissing),true);
  await page.screenshot({path:`${output}/${name}-account-mobile.png`,fullPage:true});
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:844});
    await page.goto(base+'/catalogue',{waitUntil:'networkidle'});
    await page.locator('input[name="q"]').fill('a test search');
    await page.getByRole('button',{name:'Find music'}).click();
    await page.waitForURL('**/catalogue?q=a+test+search**');
    await page.waitForLoadState('networkidle');
    // Presentation-only player state: no catalogue data or account is fabricated.
    await page.locator('.music-player').evaluate(e=>{e.hidden=false;e.querySelector('strong').textContent='Layout test';e.querySelector('[role="alert"]').textContent='This track is unavailable or has been withdrawn.';});
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    const footer=await page.locator('.site-footer').boundingBox(), player=await page.locator('.music-player').boundingBox();
    assert.ok(footer.y+footer.height<=player.y, `${name} footer obscured at ${width}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/studio/index.html',{waitUntil:'networkidle'});
  await page.screenshot({path:`${output}/${name}-desktop.png`,fullPage:true});
  report.checks.push({browser:name,interaction:'Consent, privacy keyboard focus return, direction selection, real WAV import, clear recording, required account validation, filter navigation, simulated player/footer layout',status:'PASS'});
  await browser.close();
}
assert.deepEqual(report.errors,[]);
await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',layoutCases:report.checks.length-2,interactionCases:2,pageErrors:report.errors},null,2));
