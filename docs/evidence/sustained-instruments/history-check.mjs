import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(process.cwd()+'/apps/web/package.json')('playwright');
const results=[];
for(const [kind,browserType] of Object.entries({chromium,webkit})) {
  const browser=await browserType.launch();
  try {
    const page=await browser.newPage();await page.goto('http://localhost:4173');
    const result=await page.evaluate(async wav=>{
      const {compositionKey}=await import('./novelty.js');const history=[],runs=[];
      for(let i=0;i<10;i++) {
        const started=performance.now();
        const data=await new Promise((resolve,reject)=>{
          const worker=new Worker('./engine-worker.js',{type:'module'});
          const timer=setTimeout(()=>{worker.terminate();reject(Error('worker deadline'))},120000);
          worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message))};
          worker.onmessage=({data})=>{if(data.type==='rendering')return;clearTimeout(timer);worker.terminate();data.type==='complete'?resolve(data):reject(Error(data.message))};
          worker.postMessage({wav:new Uint8Array(wav).buffer,consent:true,style:'three',seed:i===1?4123:4123+i,recent:history});
        });
        const scores=data.files.filter(f=>f.name.endsWith('.score.json')).map(f=>JSON.parse(new TextDecoder().decode(f.bytes)));
        const keys=await Promise.all(scores.map(compositionKey));
        if(keys.some(k=>history.includes(k)))throw Error('repeated instrumental body');
        history.push(...keys);runs.push({requested_seed:i===1?4123:4123+i,actual_seed:data.seed,attempts:data.attempts,seconds:(performance.now()-started)/1000,keys});
      }
      return {runs,distinct:new Set(history).size};
    },Array.from(await fs.readFile('renders/fixtures/synthetic-speech.wav')));
    assert.equal(result.distinct,30);assert(result.runs[1].attempts>1);assert.notEqual(result.runs[1].actual_seed,4123);results.push({browser:kind,version:browser.version(),status:'PASS',...result});
  } finally {await browser.close()}
}
await fs.writeFile('docs/evidence/sustained-instruments/history.json',JSON.stringify(results,null,2)+'\n');
console.log('PASS: 10 consecutive three-take worker requests in each browser, 30 distinct body hashes, bounded retry; perceptual novelty NOT RUN');
