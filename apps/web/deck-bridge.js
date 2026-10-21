export function deckBridge(snapshot) {
 const subscribers=new Set(),commands=new Map();let sequence=0;
 const sessionId=crypto.randomUUID();
 const publish=event=>{for(const listener of subscribers)listener(event);};
 function bind(element,property,action){
  const original=element[property];if(typeof original!=='function')return;
  const execute=async(value,source,event)=>{
   if(element.disabled)throw new Error('This control is unavailable.');
   if(value!==undefined){
    if(element.type==='range'||element.type==='number'){
     if(!Number.isFinite(value)||value<Number(element.min)||value>Number(element.max))throw new Error('Control value out of range');
     element.value=String(value);
    }else throw new Error('Unsupported control value');
   }
   await original(event??{target:element,currentTarget:element,shiftKey:false});
   const s=snapshot();publish({schemaVersion:1,sessionId,sequence:++sequence,action,control:element.id,
    t:s.t,source,value:element.type==='range'?Number(element.value):null});
  };
  commands.set(element.id,execute);
  element[property]=event=>execute(undefined,'user',event).catch(()=>{});
 }
 return {bind,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);},
  command(control,value){const fn=commands.get(control);if(!fn)throw new Error('Unknown deck control');return fn(value,'coach_demo');},
  sample(){if(!subscribers.size)return null;const value=snapshot();publish({action:'audio.sample',...value});return value;},
  controls:()=>[...commands.keys()]};
}
