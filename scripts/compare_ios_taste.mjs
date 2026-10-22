// Compare genuine simulator attachments with the current browser engine; no playback.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import createEngine from '../build-web/jamloom_web.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2], 'Supply xcresult exported attachments directory');
const root=pathToFileURL(resolve(process.argv[2])+'/'),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
const attachments=manifest.find(x=>x.testIdentifier==='TasteTests/testCompositionRecoveryDeterminismCancellationAndTamper()').attachments;
const report=[];
for(let index=0;index<2;index++){
 const engine=await createEngine();const args=[4123+index,110,1,13,50,30,index];
 assert.equal(engine.ccall('jamloom_web_taste','string',Array(7).fill('number'),args),'');
 const wav=Buffer.from(engine.FS.readFile('/taste.wav'));
 const nativeFile=attachments.find(x=>x.suggestedHumanReadableName.startsWith(index?'taste_b':'taste_a')).exportedFileName;
 const native=await fs.readFile(new URL(nativeFile,root));assert.deepEqual(wav,native);
 report.push({variation:index?'B':'A',status:'PASS',bytes:wav.length,sha256:createHash('sha256').update(wav).digest('hex'),args});
}
console.log(JSON.stringify({status:'PASS',scope:'iOS simulator C ABI vs existing browser WASM; identical whole WAV',report},null,2));
