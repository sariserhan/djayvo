import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {comingSoonEnabled,comingSoonRecovery,comingSoonResponse} from '../lib/coming-soon';
import {proxy} from '../proxy';

test('launch gate defaults on and only explicit false disables it',()=>{
 for(const value of [undefined,'','true','FALSE','0'])assert.equal(comingSoonEnabled({JAMLOOM_COMING_SOON:value}),true);
 assert.equal(comingSoonEnabled({JAMLOOM_COMING_SOON:'false'}),false);
});
test('coming-soon recovery allows login, support and signed callbacks, not signup or product APIs',()=>{
 for(const path of ['/account/sign-in','/account/reset-password','/api/auth/sign-in/email','/api/auth/reset-password/token','/admin','/admin/users','/api/admin/settings','/support','/api/contact','/api/payments/stripe','/api/payments/apple/notifications','/api/academy/stripe','/privacy','/sitemap.xml'])assert.equal(comingSoonRecovery(path),true,path);
 for(const path of ['/','/account','/account/sign-up','/api/auth/sign-up/email','/api/catalogue','/api/library','/api/account','/api/payments/checkout','/academy','/studio/dj.html','/admin-fake','/support/example','/api/auth/sign-in/email/fake'])assert.equal(comingSoonRecovery(path),false,path);
});
test('launch responses contain real navigation, one tracker and private caching; product APIs stay closed',async()=>{
 const home=comingSoonResponse(new Request('https://www.jamloom.com/?admin=true'));
 assert.equal(home.status,200);assert.equal(home.headers.get('cache-control'),'private, no-store');assert.equal(home.headers.get('vary'),'Cookie');
 const html=await home.text();assert.match(html,/Jamloom is coming soon/);assert.equal((html.match(/vp_QBDH92AC.js/g)||[]).length,1);assert.match(html,/href="\/account\/sign-in"/);assert.ok(!html.includes('mini-deck'));
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/studio/dj.html')).headers.get('location'),'https://www.jamloom.com/');
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/api/catalogue')).status,503);
 assert.equal(comingSoonResponse(new Request('https://www.jamloom.com/',{method:'POST'})).status,503);
 assert.equal(await comingSoonResponse(new Request('https://www.jamloom.com/',{method:'HEAD'})).text(),'');
});
test('anonymous requests cannot bypass the default gate with request headers or query flags',async()=>{
 const response=await proxy(new NextRequest('https://www.jamloom.com/?admin=true',{headers:{'x-admin':'true','x-user-email':'serhan.sari@yahoo.com'}}));
 assert.equal(response.status,200);assert.match(await response.text(),/Jamloom is coming soon/);
});

test('published Live DJ preview is accessible while other product routes remain gated',async()=>{
 assert.equal(comingSoonRecovery('/live-dj'),true);
 assert.equal(comingSoonRecovery('/live-dj/fake'),false);
 assert.equal(comingSoonRecovery('/improvise'),false);
 assert.equal(comingSoonRecovery('/api/generations'),false);
 const response=await proxy(new NextRequest('https://www.jamloom.com/live-dj'));
 assert.equal(response.headers.get('x-middleware-next'),'1');
 assert.match(await comingSoonResponse(new Request('https://www.jamloom.com/')).text(),/href="\/live-dj">Download Live DJ for Mac/);
});
