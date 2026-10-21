import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const rows=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch(name==='chromium'?{args:['--mute-audio']}:{});
 try{
  const context=await browser.newContext();await context.addInitScript(silenceSpeakers);
  const page=await context.newPage();await page.goto('about:blank');await page.setContent('<button>Check silent recording</button>');
  await page.evaluate(()=>document.querySelector('button').onclick=async()=>{
   const context=new AudioContext(),source=context.createOscillator(),recording=context.createMediaStreamDestination();
   source.connect(context.destination);source.connect(recording);
   const recorded=context.createMediaStreamSource(recording.stream),meter=context.createAnalyser();recorded.connect(meter);
   await context.resume();source.start();await new Promise(resolve=>setTimeout(resolve,500));
   const samples=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(samples);
   globalThis.result={recordingPeak:Math.max(...samples.map(Math.abs)),outputs:globalThis.__jamloomSilentOutput(),rate:context.sampleRate};
   source.stop();recording.stream.getTracks().forEach(t=>t.stop());await context.close();
  });
  await page.getByRole('button').click();await page.waitForFunction(()=>!!globalThis.result);
  const result=await page.evaluate(()=>globalThis.result);assert.ok(result.recordingPeak>.1);assert.equal(result.outputs.length,1);assert.equal(result.outputs[0].gain,0);assert.equal(result.outputs[0].peak,0);
  rows.push({browser:name,version:browser.version(),status:'PASS',...result});
 }finally{await browser.close();}
}
const path=new URL('../../../docs/evidence/academy-endurance-silent/',import.meta.url);await mkdir(path,{recursive:true});await writeFile(new URL('speaker-isolation.json',path),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
