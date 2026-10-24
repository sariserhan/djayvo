import {webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output=process.env.JAMLOOM_MOBILE_EVIDENCE??'/tmp/jamloom-mobile-studio';await mkdir(output,{recursive:true});
const browser=await webkit.launch();const context=await browser.newContext({viewport:{width:734,height:323},hasTouch:true});
await context.addInitScript(()=>{window.jamloomMobileMuted=true;});
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
 await page.goto('http://127.0.0.1:4189/dj.html');await page.waitForSelector('html[data-mobile-ready=true]');
 await page.locator('#mobile-music').click();await page.waitForFunction(()=>!document.getElementById('practice-load-a').disabled);
 await page.locator('#practice-load-a').click();await page.waitForFunction(()=>!document.getElementById('play-a').disabled);
 await page.locator('#practice-load-b').click();await page.waitForFunction(()=>!document.getElementById('play-b').disabled);
 await page.locator('#mobile-close').click();
 await page.locator('#play-a').click();await page.waitForFunction(()=>document.getElementById('play-a').textContent==='Pause A');
 await page.locator('#mobile-stop').click();await page.waitForFunction(()=>document.getElementById('play-a').textContent==='Play A');
 const geometry=[];
 for(const [name,width,height] of [['landscape',734,323],['small-landscape',568,270],['ipad',1060,750],['portrait',393,700]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,controls:['play-a','play-b','jog-a','jog-b','crossfade','eq-a-0','eq-b-2'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,visible:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})}));
  geometry.push({name,width,height,...result});await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
  assert.equal(result.overflow,false,`${name}: horizontal overflow`);
  if(name==='landscape'||name==='ipad')for(const control of result.controls)assert(control.visible,`${name}: clipped ${control.id} ${JSON.stringify(control)}`);
 }
 for(const [name,width,height,region] of [['fold-vertical',1024,768,{x:500,y:0,width:24,height:768}],['fold-horizontal',850,1050,{x:0,y:500,width:850,height:24}]]){
  await page.setViewportSize({width,height});await page.evaluate(region=>{window.jamloomMobileRegions=[region];window.jamloomMobileLayout();},region);
  await page.waitForTimeout(100);
  const overlap=await page.evaluate(region=>['play-a','play-b','crossfade'].filter(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.x<region.x+region.width&&r.right>region.x&&r.y<region.y+region.height&&r.bottom>region.y;}),region);
  assert.deepEqual(overlap,[],`${name}: controls cross the division`);
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true});geometry.push({name,width,height,division:region,overlap,scope:'Injected division geometry, not a physical Duo test'});
 }
 await page.evaluate(()=>{window.jamloomMobileRegions=[];window.jamloomMobileLayout();});
 await page.setViewportSize({width:734,height:323});await page.locator('#mobile-mode').click();
 await page.waitForFunction(()=>document.getElementById('pro-wave-a').getAttribute('aria-disabled')==='false',{},{timeout:30000});
 await page.locator('#bpm-a').fill('120');await page.locator('#bpm-a').dispatchEvent('input');
 await page.locator('#hot-a-0').click();assert.equal(await page.locator('#hot-a-0').getAttribute('data-set'),'true');
 await page.screenshot({path:`${output}/pads.png`,fullPage:true});
 await page.locator('#hot-a-0').dispatchEvent('pointerdown',{pointerType:'touch',clientX:10,clientY:10});await page.waitForTimeout(700);
 await page.locator('#hot-a-0').dispatchEvent('pointerup',{pointerType:'touch'});
 assert.equal(await page.locator('#hot-a-0').getAttribute('data-set'),'false','Touch hold clears a cue');
 const retained=await page.locator('#name-a').textContent();
 await assert.rejects(()=>page.evaluate(()=>window.jamloomMobileLoad('a','broken.wav','bm90IGF1ZGlv')));
 assert.equal(await page.locator('#name-a').textContent(),retained,'Failed native import preserves the previous track');
 const imported=await page.evaluate(async()=>{
  const {encodeWav}=await import('/audio.js');const data=new Uint8Array(encodeWav(new Float32Array(48000*2),0,2));
  let binary='';for(const byte of data)binary+=String.fromCharCode(byte);
  await window.jamloomMobileLoad('b','Saved native mix.wav',btoa(binary));return document.getElementById('name-b').textContent;
 });
 assert.equal(imported,'Saved native mix.wav');
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/report.json`,JSON.stringify({gate:'PASS',engine:'WebKit',geometry,errors,audio:'Muted automated playback; listening NOT RUN'},null,2)+'\n');
 console.log('PASS mobile shared console, actual playback, stop, AudioWorklet, cue pads and viewport checks');
}finally{await browser.close();}
