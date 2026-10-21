// Test real boundaries in a disposable Next app; no fault-injection routes ship.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const folder=await mkdtemp(join(tmpdir(),'jamloom-framework-')),fixture=join(folder,'fixture'),base='http://127.0.0.1:4230',site='http://127.0.0.1:4231';
const next=resolve('node_modules/next/dist/bin/next'),servers=[],logs=[],results=[];
const env={...process.env,DATABASE_URL:'',BETTER_AUTH_SECRET:'',RESEND_API_KEY:'',JAMLOOM_COMING_SOON:'false',NEXT_TELEMETRY_DISABLED:'1'};
delete env.VERCEL;
function run(args,cwd){const child=spawn(process.execPath,[next,...args],{cwd,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',s=>logs.push(String(s)));child.stderr.on('data',s=>logs.push(String(s)));return child;}
async function start(cwd,port){const child=run(['start','--hostname','127.0.0.1','--port',String(port)],cwd);servers.push(child);for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)return;}catch{}if(child.exitCode!==null)throw Error('Server exited');await delay(100);}throw Error('Server timeout');}
async function file(path,body){await mkdir(join(fixture,path,'..'),{recursive:true});await writeFile(join(fixture,path),body);}
try{
 await mkdir(join(fixture,'app/slow'),{recursive:true});
 await symlink(resolve('node_modules'),join(fixture,'node_modules'),'dir');
 await file('package.json',JSON.stringify({private:true,type:'module',dependencies:{next:'16.4.2',react:'19.3.1','react-dom':'19.3.1'}}));
 await file('next.config.mjs','export default {poweredByHeader:false};');
 await file('tsconfig.json',await readFile('tsconfig.json','utf8'));
 for(const name of ['error.tsx','global-error.tsx','not-found.tsx','loading-state.tsx','route-state.css'])await copyFile('app/'+name,join(fixture,'app',name));
 await copyFile('app/catalogue/loading.tsx',join(fixture,'app/slow/loading.tsx'));
 await file('app/layout.tsx',`import {cookies} from 'next/headers';export default async function Layout({children}:{children:React.ReactNode}){if((await cookies()).get('layout-failure'))throw Error('PRIVATE_LAYOUT_DETAIL');return <html lang="en"><head><title>Boundary fixture · Jamloom</title></head><body style={{margin:0,background:'#101510',color:'#f0f3eb',fontFamily:'system-ui'}}><main style={{padding:20}}>{children}</main></body></html>;}`);
 await file('app/page.tsx',`import Link from 'next/link';export default function Home(){return <><h1>Boundary fixture</h1><Link prefetch={false} href="/slow">Load music</Link></>;}`);
 await file('app/slow/page.tsx',`export const dynamic='force-dynamic';export default async function Slow(){await new Promise(r=>setTimeout(r,2500));return <h1>Music loaded</h1>;}`);
 await file('app/server-failure/page.tsx',`import {cookies} from 'next/headers';export const dynamic='force-dynamic';export default async function Failure(){if(!(await cookies()).has('server-recovered'))throw Error('PRIVATE_SERVER_DETAIL');return <h1>Server recovered</h1>;}`);
 await file('app/retry/page.tsx',`'use client';import {useState} from 'react';export default function Retry(){const [fail,setFail]=useState(false);if(fail)throw Error('PRIVATE_CLIENT_DETAIL');return <><h1>Retry recovered</h1><button onClick={()=>setFail(true)}>Trigger failure</button></>;}`);
 const build=run(['build','--webpack'],fixture);assert.equal((await once(build,'exit'))[0],0,'Fixture build failed');
 await start(fixture,4230);await start(process.cwd(),4231);
 const manifest=JSON.parse(await readFile('.next/prerender-manifest.json','utf8'));
 for(const path of ['/','/learn','/academy','/pricing'])assert.equal(manifest.routes[path]?.initialRevalidateSeconds,false,'Public route should remain prerendered: '+path);
 for(const path of ['/account','/admin','/catalogue','/library','/robots.txt','/sitemap.xml'])assert.ok(!manifest.routes[path],'Sensitive/runtime route should not be prerendered: '+path);
 for(const path of ['/missing-page/deeper','/missing-page','/learn/missing-guide','/academy/levels/missing-level']){const missing=await fetch(site+path);assert.equal(missing.status,404,path);assert.match(await missing.text(),/This track leads nowhere/);}
 const map=await (await fetch(site+'/sitemap.xml')).text();assert.ok(map.includes('https://www.jamloom.com/improvise'));assert.ok(!map.includes('/account'));
 assert.match(await (await fetch(site+'/robots.txt')).text(),/Disallow: \/account/);
 assert.match((await fetch(site+'/api/site-status')).headers.get('cache-control'),/no-store/);
 assert.equal((await fetch(base+'/server-failure')).status,500);
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',r=>[base,site].includes(new URL(r.request().url()).origin)?r.continue():r.abort());const page=await context.newPage(),siteErrors=[];page.on('pageerror',error=>{if(page.url().startsWith(site))siteErrors.push(error.message);});
   await page.goto(site+'/missing-page/deeper');await page.getByRole('heading',{name:'This track leads nowhere.'}).waitFor();
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(folder,`${name}-404-${width}.png`),fullPage:true});}
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await page.getByRole('link',{name:'Go home',exact:true}).click();await page.waitForURL(site+'/');await page.getByRole('button',{name:'Play Deck A',exact:true}).waitFor();
   // The actual homepage's client fetch also has a skeleton, without fake tracks.
   let release;const held=new Promise(r=>release=r);await page.route('**/api/catalogue?sort=latest',async route=>{await held;await route.fulfill({json:{tracks:[]}});});
   await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'Loading community music…'}).waitFor();assert.equal(await page.locator('.skeleton-card').count(),3);release();await page.getByRole('status').filter({hasText:'The first releases start with you.'}).waitFor();
   let releaseProgress;const progressHeld=new Promise(r=>releaseProgress=r);await page.route('**/api/academy/progress',async route=>{await progressHeld;await route.fulfill({status:401,json:{error:'Sign in required'}});});
   await page.goto(site+'/academy/progress',{waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'Loading your progress…'}).waitFor();assert.equal(await page.getByRole('button',{name:'Delete progress'}).count(),0);releaseProgress();await page.getByRole('status').filter({hasText:'Local practice is available.'}).waitFor();assert.deepEqual(siteErrors,[]);
   await page.goto(base);await page.getByRole('link',{name:'Load music'}).click();await page.getByRole('status',{name:''}).filter({hasText:'Loading community music…'}).waitFor();assert.equal(await page.locator('.skeleton-card').count(),3);
   assert.equal(await page.locator('.skeleton-heading').evaluate(el=>getComputedStyle(el).animationName),'none');await page.screenshot({path:join(folder,`${name}-loading.png`),fullPage:true});await page.getByRole('heading',{name:'Music loaded'}).waitFor();
   await page.goto(base+'/server-failure');await page.getByRole('heading',{name:'Let’s get you back in the groove.'}).waitFor();assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_SERVER_DETAIL'));
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
   await context.addCookies([{name:'server-recovered',value:'true',url:base}]);await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Server recovered'}).waitFor();
   await page.goto(base+'/retry');await page.getByRole('button',{name:'Trigger failure'}).click();await page.getByRole('heading',{name:'Let’s get you back in the groove.'}).waitFor();await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Retry recovered'}).waitFor();
   await context.addCookies([{name:'layout-failure',value:'true',url:base}]);await page.goto(base);await page.getByRole('heading',{name:'Let’s get you back in the groove.'}).waitFor();assert.equal(await page.title(),'Something went wrong · Jamloom');assert.equal(await page.locator('body.global-error').count(),1);assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_LAYOUT_DETAIL'));
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);await page.screenshot({path:join(folder,`${name}-global-error.png`),fullPage:true});await context.clearCookies();await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Boundary fixture'}).waitFor();
   results.push({browser:name,version:browser.version(),actualSite404AndHomeRecovery:'PASS',actualCommunityAndAcademyLoading:'PASS',actualSiteConsole:'PASS',robotsSitemapAndPrivateHeaders:'PASS',staticAndDynamicCacheBoundaries:'PASS',fixtureStreamingLoading:'PASS',fixture500:'PASS',fixtureClientAndServerRetry:'PASS',fixtureRootLayoutFailureAndRecovery:'PASS',axe:'PASS',widths:[1440,390,320],reducedMotion:'PASS',productionDeployment:'NOT RUN'});
  }finally{await browser.close();}
 }
 await writeFile(join(folder,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({folder,results},null,2));
}finally{for(const server of servers){if(server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await once(server,'exit');}}await writeFile(join(folder,'server.log'),logs.join(''));await rm(fixture,{recursive:true,force:true});console.log('Evidence:',folder);}
