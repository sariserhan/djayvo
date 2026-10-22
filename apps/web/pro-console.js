// Keep the native range inputs: MIDI, keyboard access and saved sets use the same controls.
export function rotaryValue(value,delta,min,max,step){
  const next=Math.round((value+delta*(max-min)/160)/step)*step;
  return Math.max(min,Math.min(max,Number(next.toFixed(4))));
}
export function attachProConsole(){
  const knobs=[...document.querySelectorAll('.eq input[type=range],.deck-effects input[type=range]')];
  for(const input of knobs){
    const shell=document.createElement('span'),dial=document.createElement('span');
    shell.className='rotary';dial.className='rotary-cap';dial.setAttribute('aria-hidden','true');
    input.before(shell);shell.append(dial,input);
    let drag;
    input.addEventListener('pointerdown',event=>{if(input.disabled||event.button!==0)return;event.preventDefault();input.focus();input.setPointerCapture(event.pointerId);drag={id:event.pointerId,y:event.clientY,value:Number(input.value)};});
    input.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;input.value=rotaryValue(drag.value,drag.y-event.clientY,Number(input.min),Number(input.max),Number(input.step));input.dispatchEvent(new Event('input',{bubbles:true}));});
    for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])input.addEventListener(name,()=>drag=null);
    input.addEventListener('dblclick',()=>{if(input.disabled)return;input.value=input.defaultValue;input.dispatchEvent(new Event('input',{bubbles:true}));});
  }
  function draw(){for(const input of knobs){const shell=input.parentElement,angle=-135+270*(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min));if(shell.dataset.value!==input.value){shell.style.setProperty('--angle',angle+'deg');shell.dataset.value=input.value;}shell.classList.toggle('disabled',input.disabled);}requestAnimationFrame(draw);}
  requestAnimationFrame(draw);
  if(window.jamloomDesktop){
    document.documentElement.classList.add('desktop-pro');
    document.querySelector('.brand-mode').textContent=' / PRO';
    const tools=document.querySelector('.studio-view-tools');
    for(const [text,action] of [['Open Basic',()=>window.jamloomDesktop.openBasic()],['Settings',()=>window.jamloomDesktop.openSettings()]]){const button=document.createElement('button');button.className='small-button';button.textContent=text;button.onclick=action;tools.append(button);}
    // Every destination stays in the shared studio; account and marketing pages open externally.
    document.querySelector('.brand').href='./dj.html';
    for(const link of document.querySelectorAll('header nav a'))if(link.getAttribute('href')==='./')link.href='https://www.jamloom.com/improvise';
    window.jamloomStudioActive=()=>Boolean(document.querySelector('.deck[data-playing=true],.sample-pad[data-playing=true],.piano-key[aria-pressed=true],.drum-pad[aria-pressed=true],#sustain[aria-pressed=true],#sequence-stop:not(:disabled),#c-stop:not(:disabled),#session-stop:not(:disabled),#set-record-stop:not(:disabled),#mix-record-stop:not(:disabled),#take-stop:not(:disabled)')||['phrase-record','live-phrases'].some(id=>document.getElementById(id)?.textContent.startsWith('Stop')));
    setInterval(()=>window.jamloomDesktop.state({active:window.jamloomStudioActive()}),500);
  }
}
