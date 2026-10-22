import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/apps/site/package.json');
const {chromium,webkit}=require('playwright');
const labels=['Surprise me','Reggae','Hip-hop','Funk','House','Disco','R&B','Soul','Afrobeats','Latin pop','Drum and bass','Acoustic pop','Rock','EDM','DJ','Lo-fi','Jazz','Blues','Rap','Chill','Indie','Techno','Synthwave','Country'];
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4198/');
  const menu=page.getByRole('listbox',{name:'Style',exact:true});
  for(const label of labels) {
   await menu.click();
   const option=page.getByRole('option').filter({hasText:new RegExp('^(?:✓\\s*)?'+label+'$')});
   assert.equal(await option.count(),1,label);
   await option.click();
   assert.equal(await menu.inputValue(),label);
  }
  const layouts=[];
  for(const width of [375,320]) {
   await page.setViewportSize({width,height:900});
   await menu.click();
   await page.getByRole('option',{name:/Country/}).click();
   layouts.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  assert(layouts.every(l=>!l.overflow));assert.deepEqual(errors,[]);
  await page.screenshot({path:`docs/evidence/singer-styles/${name}-mobile.png`});
  results.push({browser:name,version:browser.version(),status:'PASS',styles_selected:labels,layouts,errors,generation:'NOT RUN: catalogue expansion; prior actual pipeline evidence retained'});
 } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/singer-styles/browser.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
