import {app,BrowserWindow,Menu,protocol,session,ipcMain,dialog,shell,autoUpdater,powerSaveBlocker} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORIGIN,CATALOGUE,UPDATE_FEED,trusted,assetPath,cataloguePath,settings,CSP,permissionAllowed} from './policy.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const studio=app.isPackaged?path.join(here,'studio'):path.resolve(here,'../../dist/web');
protocol.registerSchemesAsPrivileged([{scheme:'jamloom',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,codeCache:true}}]);
if(!app.requestSingleInstanceLock()){app.quit();}else{
let main,preferences,config,settingFile,active=false,allowClose=false,updating=false,downloaded=false,updateMessage='No update check yet.',blocker;
app.on('second-instance',()=>{main?.show();main?.focus();});
app.on('window-all-closed',()=>app.quit());
app.whenReady().then(async()=>{
settingFile=path.join(app.getPath('userData'),'settings.json');
try{config=settings(JSON.parse(await fs.readFile(settingFile,'utf8')));}catch{config=settings();}
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
    if(name==='/api/site-status')return reply('{"maintenance":false,"announcement":null}',200,'application/json');
    if(cataloguePath(name)){
      if(!config.catalogue)return reply('{"error":"Online catalogue is off in Settings."}',503,'application/json');
      // Only the public catalogue is proxied; no credentials, arbitrary URLs or local files cross this boundary.
      const upstream=await fetch(CATALOGUE+name,{redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(60000)])});
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
handle('settings',()=>({...config,version:app.getVersion(),updateMessage,downloaded}));
handle('save-settings',async value=>{if(typeof value?.catalogue!=='boolean'||typeof value?.automaticUpdates!=='boolean')throw Error('Invalid settings');const next=settings(value);await fs.writeFile(settingFile+'.tmp',JSON.stringify(next),{mode:0o600});await fs.rename(settingFile+'.tmp',settingFile);config=next;return config;});
handle('open-settings',openSettings);
handle('open-basic',async()=>{const error=await shell.openPath('/Applications/Jamloom Live.app');if(error)external('https://www.jamloom.com/live-dj');});
ipcMain.on('studio-state',(event,value)=>{if(!trusted(event.senderFrame?.url)||event.senderFrame!==event.sender.mainFrame||event.sender!==main?.webContents||typeof value?.active!=='boolean')return;active=value.active;if(active&&blocker===undefined)blocker=powerSaveBlocker.start('prevent-app-suspension');if(!active)stopBlocker();});
async function studioBusy(){try{return active||!main||await main.webContents.executeJavaScript('typeof window.jamloomStudioActive !== "function" || window.jamloomStudioActive()');}catch{return true;}}
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
app.setAboutPanelOptions({applicationName:'Jamloom Pro',applicationVersion:app.getVersion(),copyright:'Local preview · Paid activation is not enabled.'});
await main.loadURL(ORIGIN+'/dj.html');
if(config.automaticUpdates)checkUpdates();
}).catch(error=>{dialog.showErrorBox('Jamloom Pro could not open',error.message);app.exit(1);});
}
