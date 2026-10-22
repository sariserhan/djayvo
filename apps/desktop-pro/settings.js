const api=window.jamloomDesktop,$=id=>document.getElementById(id);
async function refresh(){const value=await api.settings();$('license-state').textContent=value.licensed?(value.licenseExpires?'Pro v1 active · offline until '+new Date(value.licenseExpires*1000).toLocaleDateString():'Development studio'):(value.licenseMessage||'Activate Pro to open the studio.');$('open-studio').disabled=!value.licensed;$('version').textContent='Version '+value.version;$('catalogue').checked=value.catalogue;$('automatic').checked=value.automaticUpdates;$('status').textContent=value.updateMessage;$('install').hidden=!value.downloaded;}
for(const id of ['catalogue','automatic'])$(id).onchange=async()=>{try{await api.saveSettings({catalogue:$('catalogue').checked,automaticUpdates:$('automatic').checked});}catch{$('status').textContent='Could not save settings. Try again.';}};
$('check').onclick=async()=>{$('status').textContent=await api.checkUpdates();};
$('install').onclick=async()=>{$('status').textContent=await api.installUpdate();};
$('basic').onclick=()=>api.openBasic();
void refresh();setInterval(()=>{if(document.hasFocus())void refresh();},2000);

$('pro-account').onclick=()=>api.openProAccount();$('open-studio').onclick=()=>api.openStudio();
for(const [id,fn]of [['activate',()=>api.activate()],['renew-license',()=>api.renewLicense()]])$(id).onclick=async()=>{$(id).disabled=true;try{$('license-state').textContent=await fn();}finally{$(id).disabled=false;}};
