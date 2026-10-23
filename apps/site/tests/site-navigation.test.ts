import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioSiteShell} from '../scripts/studio-site-shell.mjs';
import navigation from '../lib/site-navigation.json';

test('hosted studios share main navigation and retain their local controls',()=>{
  for(const name of ['index.html','dj.html']){
    const original=readFileSync(new URL(`../../web/${name}`,import.meta.url),'utf8');
    const hosted=studioSiteShell(original);
    const header=hosted.match(/<header class="site-header">.*?<\/header>/s)![0];
    assert.equal([...header.matchAll(/<nav aria-label="Main">(.*?)<\/nav>/gs)].length,1);
    for(const {href,label} of navigation)assert.ok(header.includes(`<a href="${href}">${label}</a>`));
    assert.ok(header.includes('href="/" aria-label="Jamloom home"'));
    assert.ok(hosted.includes('<nav aria-label="Studio shortcuts">'));
    assert.equal((hosted.match(/aria-label="Main"/g)??[]).length,1);
    if(name==='index.html'){
      assert.ok(hosted.includes('<a href="#mixes">Your mixes</a>'));
      assert.equal((hosted.match(/id="privacy-open"/g)??[]).length,1);
    }else{
      assert.equal((hosted.match(/class="brand-mode"/g)??[]).length,1);
      assert.ok(hosted.includes('<a href="./index.html">Voice studio</a>'));
    }
    assert.ok(!original.includes('class="site-header"'),'standalone navigation stays local');
  }
  assert.throws(()=>studioSiteShell('<main>Changed markup</main>'),/navigation changed/);
});
