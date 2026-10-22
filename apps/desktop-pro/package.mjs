import {packager} from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const metadata=JSON.parse(await fs.readFile(path.join(here,'package.json'),'utf8'));
const stage=await fs.mkdtemp(path.join(os.tmpdir(),'jamloom-pro-package-'));
try{
 for(const file of ['package.json','main.mjs','policy.mjs','preload.cjs','settings.html','settings.js','license.mjs','license-public.pem'])await fs.copyFile(path.join(here,file),path.join(stage,file));
 await fs.cp(path.join(root,'dist/web'),path.join(stage,'studio'),{recursive:true});
 await fs.copyFile(path.join(here,'node_modules/electron/dist/LICENSE'),path.join(stage,'electron-license.txt'));
 await fs.copyFile(path.join(here,'node_modules/electron/dist/LICENSES.chromium.html'),path.join(stage,'chromium-licenses.html'));
 const identity=process.env.JAMLOOM_SIGN_IDENTITY;
 await fs.mkdir(path.join(root,'dist/releases'),{recursive:true});
 const out=identity?await fs.mkdtemp(path.join(root,'dist/releases/pro-'+metadata.version+'-')):path.join(root,'dist/pro');
 const result=await packager({dir:stage,out,name:'Jamloom Pro',appBundleId:'com.jamloom.pro',appCategoryType:'public.app-category.music',platform:'darwin',arch:'arm64',electronVersion:metadata.devDependencies.electron,asar:true,overwrite:true,icon:path.join(root,'apps/desktop-companion/Resources/AppIcon.icns'),extendInfo:{NSMicrophoneUsageDescription:'Record a phrase or sample only when you choose Record.',LSMinimumSystemVersion:'14.2',NSHumanReadableCopyright:'Jamloom Pro v1. One-time license.'},
  ...(identity?{osxSign:{identity,gatekeeperAssess:false,optionsForFile:()=>({hardenedRuntime:true,entitlements:path.join(here,'Release.entitlements')})}}:{})});
 console.log(result.join('\n'));
}finally{await fs.rm(stage,{recursive:true,force:true});}
