import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import {origin,features} from '../lib/product';

test('metadata follows runtime launch mode and never advertises private routes',()=>{
 const previous=process.env.JAMLOOM_COMING_SOON;
 try{
  for(const mode of [undefined,'true','false']){
   if(mode===undefined)delete process.env.JAMLOOM_COMING_SOON;else process.env.JAMLOOM_COMING_SOON=mode;
   const map=sitemap(),bot=robots(),rules=bot.rules;
   assert.ok(!Array.isArray(rules));
   assert.equal(bot.sitemap,origin+'/sitemap.xml');
   assert.equal(new Set(map.map(p=>p.url)).size,map.length);
   assert.ok(map.every(p=>p.url.startsWith(origin+'/')));
   assert.ok(map.every(p=>!/^\/(account|admin|library|playlists|review|api|studio)(\/|$)/.test(new URL(p.url).pathname)));
   if(mode==='false'){
    for(const f of features)assert.ok(map.some(p=>p.url===origin+'/'+f.slug));
    assert.ok(Array.isArray(rules.disallow));
    for(const path of ['/account','/admin','/api/','/academy/checkout','/academy/progress'])assert.ok(rules.disallow.includes(path));
   }else{
    assert.deepEqual(map,[{url:origin+'/'}]);
    assert.equal(rules.disallow,'/');assert.ok(rules.allow?.includes('/$'));
   }
  }
 }finally{if(previous===undefined)delete process.env.JAMLOOM_COMING_SOON;else process.env.JAMLOOM_COMING_SOON=previous;}
});
