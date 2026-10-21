export function attachAcademyOffline(panel){
 const scope=new URL('/academy-offline/',location.origin).href,prefix=`jamloom-academy:${scope}:`;
 const box=document.createElement('div');box.className='academy-actions';
 box.innerHTML='<button type="button">Save free lesson offline</button><button type="button">Remove offline lesson</button><p role="status">Save while online, then reopen this page offline. Up to 64 MiB; browser cleanup may evict it. Account sync and paid chapters require a connection.</p>';
 panel.append(box);const [save,remove]=box.querySelectorAll('button'),status=box.querySelector('p');
 if(!('serviceWorker'in navigator)||!('caches'in window)){save.disabled=remove.disabled=true;status.textContent='Offline storage is unavailable in this browser. The online lesson still works.';return;}
 save.onclick=async()=>{save.disabled=remove.disabled=true;status.textContent='Saving the free lesson, studio and licensed music…';
  try{const registration=await navigator.serviceWorker.register(scope+'service-worker.js',{scope,updateViaCache:'none'}),worker=registration.installing;
   if(worker)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('timeout')),75000);function finish(error){clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve();}function changed(){if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(Error('install failed'));}worker.addEventListener('statechange',changed);changed();});
   status.textContent='Saved. Close other offline lesson tabs, then reopen this page to use the saved version. No account or paid content was cached.';
  }catch{status.textContent='Could not save. Check connection and free storage. Existing recordings and account progress are unchanged.';}finally{save.disabled=remove.disabled=false;}
 };
 remove.onclick=async()=>{save.disabled=remove.disabled=true;try{for(const registration of await navigator.serviceWorker.getRegistrations())if(registration.scope===scope)await registration.unregister();for(const key of await caches.keys())if(key.startsWith(prefix))await caches.delete(key);status.textContent='Offline lesson removed. Your recordings and progress remain. Reopen online to prepare again.';}catch{status.textContent='Removal failed. Try again; your recordings are unchanged.';}finally{save.disabled=remove.disabled=false;}};
}
