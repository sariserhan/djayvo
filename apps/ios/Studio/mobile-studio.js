// Rearrange the existing controls; their shared transport and DSP handlers stay intact.
export function attachMobileStudio() {
 const $=id=>document.getElementById(id), main=$('dj');
 document.documentElement.classList.add('mobile-studio');
 const bar=document.createElement('nav');bar.className='mobile-bar';bar.setAttribute('aria-label','DJ tools');
 bar.innerHTML='<strong>JAMLOOM <span>DJ</span></strong><button id="mobile-music">Music</button><button id="mobile-mode" aria-label="Performance pads and effects" aria-pressed="false">Pads & FX</button><button id="mobile-stop">Stop</button>';
 main.prepend(bar);
 const dialog=document.createElement('dialog');dialog.className='mobile-library';dialog.setAttribute('aria-label','Load music');
 dialog.innerHTML='<div class="mobile-library-heading"><h2>Load music</h2><button id="mobile-close">Done</button></div><p>Choose a track for each deck. Playback starts when you press Play.</p>';
 const own=document.createElement('fieldset');own.innerHTML='<legend>Your audio files</legend>';
 const consent=document.createElement('label');consent.className='mobile-consent';consent.innerHTML='<input type="checkbox" id="mobile-permission">I have permission to play and mix these files.';
 dialog.append(consent,own);
 const unload=document.createElement('div');unload.className='session-actions';dialog.append(unload);
 for(const id of ['a','b']) {
  const label=$(`file-${id}`).closest('label');label.querySelector('span').textContent=`Deck ${id.toUpperCase()}`;own.append(label);unload.append($(`clear-${id}`));
 }
 if(window.webkit?.messageHandlers?.savedSongs){
  const saved=document.createElement('div');saved.className='session-actions';
  for(const id of ['a','b']){const button=document.createElement('button');button.textContent=`Saved mix → ${id.toUpperCase()}`;button.onclick=()=>{dialog.close();window.webkit.messageHandlers.savedSongs.postMessage(id);};saved.append(button);}
  dialog.append(saved);
 }
 own.disabled=true;consent.querySelector('input').onchange=e=>own.disabled=!e.target.checked;
 const library=$('practice-library');dialog.append(library);document.body.append(dialog);
 $('mobile-music').onclick=()=>dialog.showModal();$('mobile-close').onclick=()=>dialog.close();
 $('mobile-mode').onclick=()=>{const pads=main.dataset.mobilePanel!=='pads';main.dataset.mobilePanel=pads?'pads':'decks';$('mobile-mode').setAttribute('aria-pressed',String(pads));$('mobile-mode').textContent=pads?'Jog wheels':'Pads & FX';};
 $('crossfade').setAttribute('aria-label','Crossfader');
 $('mobile-stop').onclick=()=>window.jamloomMobileStop();
 for(const id of ['a','b']) {
  const deck=$(`jog-${id}`).closest('.deck');
  const load=document.createElement('button');load.className='mobile-load';load.textContent=`Load ${id.toUpperCase()}`;load.setAttribute('aria-label',`Load deck ${id.toUpperCase()}`);load.onclick=()=>dialog.showModal();
  deck.querySelector('.deck-heading').append(load);
  const tools=document.createElement('div');tools.className='mobile-pad-panel';
  for(const selector of ['.pro-deck-toolbar','.pro-tempo','.pro-pad-modes','.hotcues','.pro-jump-direction','.deck-tools','.pro-grid-editor','.deck-fx-panel','.pad-help']) { const control=deck.querySelector(selector);if(control)tools.append(control); }
  deck.querySelector('.transport').before(tools);
  // Keep the waveform in its deck instead of a separate tall desktop overview.
  const lane=document.querySelector(`.pro-wave-${id}`);deck.querySelector('.deck-display').append(lane);
  $(`pro-prepare-${id}`).textContent='Enable waveform & pads';
  $(`rate-reset-${id}`).setAttribute('aria-label',`Reset deck ${id.toUpperCase()} speed`);
 }
 for(const button of document.querySelectorAll('.hotcue')){
  let timer,origin,suppressUntil=0;
  const cancel=()=>{clearTimeout(timer);timer=null;};
  button.addEventListener('pointerdown',event=>{
   cancel();if(event.pointerType!=='touch'||button.disabled||button.closest('.hotcues').dataset.mode!=='hot'||button.dataset.set!=='true')return;
   origin=[event.clientX,event.clientY];timer=setTimeout(()=>{suppressUntil=performance.now()+800;button.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));},600);
  });
  button.addEventListener('pointermove',event=>{if(origin&&Math.hypot(event.clientX-origin[0],event.clientY-origin[1])>10)cancel();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,cancel);
  button.addEventListener('click',event=>{if(performance.now()<suppressUntil&&!event.shiftKey){event.preventDefault();event.stopImmediatePropagation();}},true);
  button.addEventListener('contextmenu',event=>event.preventDefault());
 }
 $('aurowall-status').hidden=true;
 const credits=document.createElement('details');credits.innerHTML='<summary>Music credits</summary>';const list=document.createElement('div');credits.append(list);library.append(credits);
 fetch('./practice-audio/manifest.json').then(r=>r.json()).then(data=>{for(const track of data.tracks){const p=document.createElement('p');p.textContent=`${track.title} — ${track.artist} · ${track.license}`;list.append(p);}}).catch(()=>{list.textContent='Credits could not load.';});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)window.jamloomMobileStop();});
 window.jamloomMobileLayout=()=>{
  delete main.dataset.fold;
  const region=(window.jamloomMobileRegions??[]).find(r=>r.width>0&&r.height>0&&(r.height>=innerHeight*.8||r.width>=innerWidth*.8));
  if(!region)return;
  const vertical=region.height>=innerHeight*.8;
  const start=vertical?region.x:region.y, span=vertical?region.width:region.height, total=vertical?innerWidth:innerHeight;
  if(start<120||start+span>total-120)return;
  main.dataset.fold=vertical?'vertical':'horizontal';
  main.style.setProperty('--fold-start',start+'px');main.style.setProperty('--fold-size',span+'px');
  main.style.setProperty('--bar-height',bar.getBoundingClientRect().height+'px');
 };
 addEventListener('resize',()=>window.jamloomMobileLayout());window.jamloomMobileLayout();
 document.documentElement.dataset.mobileReady='true';
}
