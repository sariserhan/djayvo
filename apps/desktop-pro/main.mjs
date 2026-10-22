import {verifyLicense} from './license.mjs';
import {app,BrowserWindow,Menu,protocol,session,ipcMain,dialog,shell,autoUpdater,powerSaveBlocker} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORIGIN,CATALOGUE,UPDATE_FEED,trusted,assetPath,cataloguePath,settings,CSP,permissionAllowed} from './policy.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const studio=app.isPackaged?path.join(here,'studio'):path.resolve(here,'../../dist/web');
protocol.registerSchemesAsPrivileged([{scheme:'jamloom',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,codeCache:true}}]);
if(!app.requestSingleInstanceLock()){app.quit();}else{
let main,preferences,config,settingFile,licenseToken='',licenseMessage='',active=false,allowClose=false,updating=false,downloaded=false,updateMessage='No update check yet.',blocker;
app.on('second-instance',()=>{main?.show();main?.focus();});
app.on('window-all-closed',()=>app.quit());
app.whenReady().then(async()=>{
settingFile=path.join(app.getPath('userData'),'settings.json');
try{config=settings(JSON.parse(await fs.readFile(settingFile,'utf8')));}catch{config=settings();}
const licenseFile=path.join(app.getPath('userData'),'pro.license');
try{const stat=await fs.stat(licenseFile);if(stat.size<=4096)licenseToken=(await fs.readFile(licenseFile,'utf8')).trim();}catch{}
const license=()=>{const value=verifyLicense(licenseToken);return value&&!value.sandbox?value:null;};
const playable=()=>!app.isPackaged||!!license();
async function saveLicense(token){const value=verifyLicense(token);if(!value||value.sandbox)throw Error('Choose a valid Jamloom Pro activation file. Test purchases cannot activate this app.');await fs.writeFile(licenseFile+'.tmp',token,{mode:0o600});await fs.rename(licenseFile+'.tmp',licenseFile);licenseToken=token;licenseMessage='Pro v1 activated.';}
async function renewLicense(){
 if(!licenseToken||!verifyLicense(licenseToken,{allowExpired:true}))return;
 try{const r=await fetch(CATALOGUE+'/api/pro/refresh',{method:'POST',headers:{Authorization:'Bearer '+licenseToken},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(r.status===401||r.status===403){licenseToken='';await fs.rm(licenseFile,{force:true});licenseMessage='Pro access needs attention. Check your account.';return;}
  if(!r.ok)throw Error();const body=await r.text();if(body.length>8192)throw Error();await saveLicense(JSON.parse(body).license);
 }catch{licenseMessage=license()?'Offline access available. Renewal will retry next time.':'Connect to the internet and renew Pro access.';}
}
const ses=session.defaultSession;
const allowed=(wc,url)=>wc&&!wc.isDestroyed()&&trusted(wc.getURL())&&trusted(url);
ses.setPermissionCheckHandler((wc,permission,url,details)=>allowed(wc,url)&&(permission==='media'?details.mediaType==='audio':permissionAllowed(permission,details)));
ses.setPermissionRequestHandler(async(wc,permission,done,details)=>{
  if(!allowed(wc,details.requestingUrl)||!details.isMainFrame||!permissionAllowed(permission,details))return done(false);
  if(permission==='fullscreen')return done(true);
  const result=await dialog.showMessageBox(BrowserWindow.fromWebContents(wc),{type:'question',buttons:['Cancel','Allow'],defaultId:0,cancelId:0,message:permission==='media'?'Allow microphone recording?':['midi','midiSysex'].includes(permission)?'Allow MIDI controllers?':'Allow audio output selection?',detail:'Only this local studio can use this permission. Your audio stays on this Mac.'});
  done(result.response===1&&!wc.isDestroyed());
});
ses.setDevicePermissionHandler(()=>false);
ses.webRequest.onBeforeRequest((details,done)=>done({cancel:!trusted(details.url)&&!details.url.startsWith('blob:'+ORIGIN+'/')&&!details.url.startsWith('devtools:')}));
ses.protocol.handle('jamloom',async request=>{
  const headers={'Content-Security-Policy':CSP,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const reply=(body,status=200,type='text/plain')=>new Response(body,{status,headers:{...headers,'Content-Type':type}});
  try{
    if(!trusted(request.url)||request.method!=='GET')return reply('Not allowed',403);
    const name=new URL(request.url).pathname;
    if(name==='/dj.html'&&!playable())return Response.redirect(ORIGIN+'/settings.html');
    if(name==='/api/site-status')return reply('{"maintenance":false,"announcement":null}',200,'application/json');
    if(cataloguePath(name)){
      if(!config.catalogue)return reply('{"error":"Online catalogue is off in Settings."}',503,'application/json');
      // Only the public catalogue is proxied; no credentials, arbitrary URLs or local files cross this boundary.
      const upstream=await fetch(CATALOGUE+name,{headers:licenseToken?{Authorization:'Bearer '+licenseToken}:{},redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(60000)])});
      const type=upstream.headers.get('content-type')??'';
      if(!upstream.ok||!(name==='/api/aurowall'?type.includes('application/json'):type.includes('audio/')))return reply('{"error":"Aurowall is temporarily unavailable. Local music still works."}',503,'application/json');
      let size=0;const limit=name==='/api/aurowall'?2*1024*1024:100*1024*1024;
      const body=upstream.body.pipeThrough(new TransformStream({transform(chunk,controller){size+=chunk.length;if(size>limit)throw Error('Catalogue response too large');controller.enqueue(chunk);}}));
      return new Response(body,{headers:{...headers,'Content-Type':type}});
    }
    const licenses={'/electron-license.txt':'LICENSE','/chromium-licenses.html':'LICENSES.chromium.html'};
    const own=['/settings.html','/settings.js',...Object.keys(licenses)].includes(name);
    const file=!app.isPackaged&&licenses[name]?path.join(here,'node_modules/electron/dist',licenses[name]):assetPath(request.url,own?here:studio);
    if(!file||name==='/service-worker.js')return reply('Not found',404);
    const resolved=await fs.realpath(file),root=await fs.realpath(own?here:studio);
    if(!resolved.startsWith(root+path.sep))return reply('Not found',404);
    const bytes=await fs.readFile(resolved);
    const type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.mp3':'audio/mpeg','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)]??'text/plain';
    return reply(bytes,200,type);
  }catch{return reply('Unavailable. Try again.',503);}
});
function window(title,width,height){
  const win=new BrowserWindow({title,width,height,minWidth:title.endsWith('Settings')?600:960,minHeight:680,backgroundColor:'#171b20',show:false,webPreferences:{preload:path.join(here,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false}});
  win.once('ready-to-show',()=>win.show());
  win.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url)){event.preventDefault();external(url);}});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.on('render-process-gone',()=>{active=false;stopBlocker();dialog.showMessageBox({type:'error',message:'The studio stopped.',detail:'Reopen Jamloom Pro and restore your saved set. Unsaved recordings may be lost.'});});
  return win;
}
function external(url){try{const u=new URL(url);if(u.protocol==='https:'&&['www.jamloom.com','jamloom.com','aurowall.com','github.com'].includes(u.hostname))void shell.openExternal(u.href);}catch{}}
function stopBlocker(){if(blocker!==undefined){powerSaveBlocker.stop(blocker);blocker=undefined;}}
function openSettings(){if(preferences){preferences.show();return;}preferences=window('Jamloom Pro Settings',980,720);preferences.on('closed',()=>preferences=null);void preferences.loadURL(ORIGIN+'/settings.html');}
function guard(event){if(!trusted(event.senderFrame?.url)||event.senderFrame!==event.sender.mainFrame)throw Error('Untrusted frame');}
const handle=(name,fn)=>ipcMain.handle(name,(event,value)=>{guard(event);return fn(value);});
handle('settings',()=>({...config,version:app.getVersion(),updateMessage,downloaded,licensed:playable(),licenseExpires:license()?.expires??null,licenseMessage}));
handle('save-settings',async value=>{if(typeof value?.catalogue!=='boolean'||typeof value?.automaticUpdates!=='boolean')throw Error('Invalid settings');const next=settings(value);await fs.writeFile(settingFile+'.tmp',JSON.stringify(next),{mode:0o600});await fs.rename(settingFile+'.tmp',settingFile);config=next;return config;});
handle('open-settings',openSettings);
handle('activate',async()=>{if(await studioBusy())return 'Pause playback and recording first.';const chosen=await dialog.showOpenDialog(main,{properties:['openFile'],filters:[{name:'Jamloom activation',extensions:['license']}]});if(chosen.canceled)return 'Activation cancelled.';try{const stat=await fs.stat(chosen.filePaths[0]);if(!stat.isFile()||stat.size>4096)throw Error();await saveLicense((await fs.readFile(chosen.filePaths[0],'utf8')).trim());return licenseMessage;}catch{return licenseMessage='Activation file is invalid or expired. Download a fresh file from your account.';}});
handle('renew-license',async()=>{if(await studioBusy())return 'Pause playback and recording first.';await renewLicense();return licenseMessage;});
handle('open-pro-account',()=>external('https://www.jamloom.com/pro'));
handle('open-studio',async()=>{if(!playable())return;if(!main.webContents.getURL().endsWith('/dj.html'))await main.loadURL(ORIGIN+'/dj.html');main.show();main.focus();});
handle('open-basic',async()=>{const error=await shell.openPath('/Applications/Jamloom Live.app');if(error)external('https://www.jamloom.com/live-dj');});
ipcMain.on('studio-state',(event,value)=>{if(!trusted(event.senderFrame?.url)||event.senderFrame!==event.sender.mainFrame||event.sender!==main?.webContents||typeof value?.active!=='boolean')return;active=value.active;if(active&&blocker===undefined)blocker=powerSaveBlocker.start('prevent-app-suspension');if(!active)stopBlocker();});
async function studioBusy(){try{return active||!main||(main.webContents.getURL().endsWith('/settings.html')?false:await main.webContents.executeJavaScript('typeof window.jamloomStudioActive !== "function" || window.jamloomStudioActive()'));}catch{return true;}}
async function checkUpdates(){
  if(await studioBusy())return updateMessage='Pause playback and finish recording before checking updates.';
  if(!app.isPackaged)return updateMessage='Updates are available in signed releases. This is a local Pro preview.';
  if(updating)return updateMessage;
  updating=true;updateMessage='Checking for updates…';autoUpdater.setFeedURL({url:UPDATE_FEED,serverType:'json'});
  try{autoUpdater.checkForUpdates();}catch{updating=false;updateMessage='No published Pro update is available yet. Your app is unchanged.';}
  return updateMessage;
}
handle('check-updates',checkUpdates);
autoUpdater.on('error',()=>{updating=false;updateMessage='Could not check Pro updates. Try again later; your installed app is unchanged.';});
autoUpdater.on('update-not-available',()=>{updating=false;updateMessage='You have the latest Pro version.';});
autoUpdater.on('update-available',()=>{updateMessage='Downloading an update. Save your work before quitting; the update installs on quit.';});
autoUpdater.on('update-downloaded',()=>{downloaded=true;updating=false;updateMessage='Update ready. Save your work. Install now, or it will install when you quit.';});
handle('install-update',async()=>{if(!downloaded||await studioBusy())return 'Stop playback and recording before installing.';const result=await dialog.showMessageBox(main,{buttons:['Cancel','Install and restart'],defaultId:0,cancelId:0,message:'Install the update?',detail:'Download recordings and save your set first. Unsaved work will close.'});if(result.response===1&&!await studioBusy()){allowClose=true;autoUpdater.quitAndInstall();}return updateMessage;});
main=window('Jamloom Pro · Performance Studio',1512,1000);
main.on('close',event=>{if(allowClose)return;event.preventDefault();void dialog.showMessageBox(main,{buttons:['Keep working',downloaded?'Quit and install update':'Quit'],defaultId:0,cancelId:0,message:'Close Performance Studio?',detail:'Save your set and download recordings before quitting. Unsaved work will be lost.'+(downloaded?' The downloaded update will install when the app closes.':'')}).then(result=>{if(result.response===1){allowClose=true;app.quit();}});});
main.on('closed',()=>{main=null;stopBlocker();preferences?.close();});
Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Jamloom Pro',submenu:[{role:'about'},{label:'Settings…',accelerator:'CmdOrCtrl+,',click:openSettings},{label:'Check for Updates…',click:()=>{checkUpdates();openSettings();}},{type:'separator'},{role:'quit'}]},{role:'editMenu'},{label:'View',submenu:[{role:'togglefullscreen'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]},{label:'Help',submenu:[{label:'Open Jamloom Basic',click:()=>shell.openPath('/Applications/Jamloom Live.app')},{label:'Support',click:()=>external('https://www.jamloom.com/support')}]}]));
app.setAboutPanelOptions({applicationName:'Jamloom Pro',applicationVersion:app.getVersion(),copyright:'Jamloom Pro v1 · One-time license'});
await renewLicense();
await main.loadURL(ORIGIN+(playable()?'/dj.html':'/settings.html'));
if(config.automaticUpdates)checkUpdates();
}).catch(error=>{dialog.showErrorBox('Jamloom Pro could not open',error.message);app.exit(1);});
}
