// Network-only notices never interrupt playback or become part of an offline session.
let controller=new AbortController();
async function updateAnnouncement(){
 try{if(controller.signal.aborted)controller=new AbortController();const response=await fetch('/api/site-status',{cache:'no-store',signal:controller.signal});if(!response.ok)return;
  const {banner}=await response.json();let element=document.getElementById('site-announcement');
  if(typeof banner!=='string'||!banner){element?.remove();return;}
  if(!element){element=document.createElement('aside');element.id='site-announcement';element.setAttribute('aria-label','Site announcement');element.setAttribute('role','status');document.body.prepend(element);}
  element.textContent=banner;
 }catch{/* Prepared offline music remains available. */}
}
if(!window.jamloomMobile){void updateAnnouncement();setInterval(updateAnnouncement,60000);}
window.addEventListener('pagehide',()=>controller.abort());
