'use strict';
const packet=JSON.parse(document.querySelector('#packet').textContent);
const form=document.querySelector('form'),status=document.querySelector('#status');
let dirty=false;
const saved=new Set();
form.addEventListener('input',()=>{dirty=true;saved.clear();status.textContent='Responses stay in this tab. Download both files before closing.';});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('play',event=>{for(const audio of document.querySelectorAll('audio'))if(audio!==event.target)audio.pause();},true);
const csv=rows=>rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
const note=value=>/^[\s]*[=+\-@]/.test(value)?"'"+value:value;
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const values=new FormData(form),listener=values.get('listener_id'),kind=event.submitter?.value;
  if(!['ratings','pairs'].includes(kind))return;
  const rows=[kind==='ratings'?packet.rating_columns:packet.pair_columns];
  if(kind==='ratings')for(const code of packet.codes){
    rows.push([listener,packet.clip_id,packet.block_id,code,...packet.rating_fields.map(field=>values.get(code+'-'+field)),note(values.get(code+'-notes'))]);
  }else for(let i=0;i<packet.pairs.length;i++){
    rows.push([listener,packet.clip_id,packet.block_id,...packet.pairs[i],values.get('pair-'+i),note(values.get('pair-notes-'+i))]);
  }
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`${kind==='ratings'?'responses':'pairs'}-${packet.block_id}-${listener}.csv`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
  saved.add(kind);dirty=saved.size!==2;
  status.textContent=dirty?'One file prepared. Download the other file too; nothing was uploaded.':'Both files prepared. Check your downloads before closing. Nothing was uploaded.';
});
