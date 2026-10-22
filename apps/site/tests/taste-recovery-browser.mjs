import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {chromium} from 'playwright';
const base=process.env.JAMLOOM_TEST_URL??'http://127.0.0.1:4247';assert.equal(new URL(base).hostname,'127.0.0.1');
const browser=await chromium.launch({args:['--mute-audio']});
try{
 const context=await browser.newContext();await context.addInitScript(()=>localStorage.setItem('jamloom-taste-v1','corrupt-profile-preserved'));
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 let release;const pending=new Promise(resolve=>{release=resolve;});let hold=false;
 await context.route('**/api/music-search',async route=>{if(hold)await pending;await route.fulfill({json:{suggestions:[]}}).catch(()=>{});});
 const page=await context.newPage();await page.goto(base+'/music-dna');
 await page.getByRole('status').filter({hasText:'Saved favorites could not be read'}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('jamloom-taste-v1')),'corrupt-profile-preserved');
 await page.getByRole('combobox',{name:'Search artists or tracks'}).fill('Unmatched favorite');await page.getByRole('option',{name:/Add by name/}).click();
 hold=true;const requested=page.waitForRequest(r=>r.url().endsWith('/api/music-search'));
 await page.getByRole('button',{name:'Make my music',exact:true}).click();await requested;
 await page.getByRole('button',{name:'Cancel composition',exact:true}).click();release();
 await page.getByRole('status').filter({hasText:'Composition stopped'}).waitFor();await page.waitForTimeout(300);
 assert.equal(await page.locator('audio[src^="blob:"]').count(),0);assert.equal(await page.getByRole('button',{name:'Make my music',exact:true}).isEnabled(),true);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('jamloom-taste-v1')).references),['Unmatched favorite']);
 const result={status:'PASS',corrupt_saved_data_preserved_until_new_list:true,cancel_during_metadata_lookup:true,late_response_cannot_start_render:true,favorites_preserved:true};
 await writeFile(process.env.JAMLOOM_TEST_EVIDENCE??'/tmp/jamloom-dna-auto-recovery.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
