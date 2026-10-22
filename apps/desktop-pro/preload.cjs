const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('jamloomDesktop',{
  activate:()=>ipcRenderer.invoke('activate'),
  renewLicense:()=>ipcRenderer.invoke('renew-license'),
  openProAccount:()=>ipcRenderer.invoke('open-pro-account'),
  openStudio:()=>ipcRenderer.invoke('open-studio'),
  settings:()=>ipcRenderer.invoke('settings'),
  saveSettings:value=>ipcRenderer.invoke('save-settings',value),
  openSettings:()=>ipcRenderer.invoke('open-settings'),
  openBasic:()=>ipcRenderer.invoke('open-basic'),
  checkUpdates:()=>ipcRenderer.invoke('check-updates'),
  installUpdate:()=>ipcRenderer.invoke('install-update'),
  state:value=>ipcRenderer.send('studio-state',value)
});
