const api=window.jamloomDesktop,$=id=>document.getElementById(id);
async function refresh(){const value=await api.settings();$('version').textContent='Version '+value.version;$('catalogue').checked=value.catalogue;$('automatic').checked=value.automaticUpdates;$('status').textContent=value.updateMessage;$('install').hidden=!value.downloaded;}
for(const id of ['catalogue','automatic'])$(id).onchange=async()=>{try{await api.saveSettings({catalogue:$('catalogue').checked,automaticUpdates:$('automatic').checked});}catch{$('status').textContent='Could not save settings. Try again.';}};
$('check').onclick=async()=>{$('status').textContent=await api.checkUpdates();};
$('install').onclick=async()=>{$('status').textContent=await api.installUpdate();};
$('basic').onclick=()=>api.openBasic();
void refresh();setInterval(()=>{if(document.hasFocus())void refresh();},2000);
