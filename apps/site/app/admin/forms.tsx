'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {SiteSettings} from '../../lib/site-settings';
function useAdminAction(){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),router=useRouter();
 async function send(path:string,body:unknown){setBusy(true);setStatus('Saving…');try{
  const response=await fetch('/api/admin/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
  if(!response.ok)throw new Error(data.error??'Update failed.');setStatus('Saved.');router.refresh();return true;
 }catch(e){setStatus(e instanceof Error?e.message:'Update failed. Try again.');return false;}finally{setBusy(false);}}
 return {send,status,busy};
}
export function SettingsForm({settings,liveConfigured}:{settings:SiteSettings;liveConfigured:boolean}){
 const {send,status,busy}=useAdminAction();
 return <form className="admin-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await send('settings',{revision:settings.revision,maintenance:f.has('maintenance'),maintenance_message:f.get('maintenance_message'),banner:f.get('banner'),billing_mode:f.get('billing_mode')});}}>
 <label className="admin-check"><input type="checkbox" name="maintenance" defaultChecked={settings.maintenance}/> Maintenance mode</label><p>Visitors receive a temporary-unavailable page. Owner access, account recovery, support and payment notifications stay available. Allow up to five seconds for changes to reach other servers.</p>
 <label>Maintenance message<textarea name="maintenance_message" defaultValue={settings.maintenance_message} maxLength={500} required rows={3}/></label>
 <label>Public announcement<textarea name="banner" defaultValue={settings.banner} maxLength={500} rows={3}/></label><p>Plain text only. Leave empty to remove the banner.</p>
 <label>Billing environment<select name="billing_mode" defaultValue={settings.billing_mode}><option value="test">Test — no real charges</option><option value="live" disabled={!liveConfigured}>Live{liveConfigured?'':' — credentials required'}</option></select></label>
 <p>Live mode uses separate keys and products. It does not override product release gates. Test purchases do not unlock live access.</p>
 <button disabled={busy} type="submit">Save site settings</button><p role="status">{status}</p></form>;
}
export function UserAction({id,suspended}:{id:string;suspended:boolean}){const {send,status,busy}=useAdminAction();return <div><button disabled={busy} onClick={()=>send('users/'+encodeURIComponent(id),{suspended:!suspended})}>{suspended?'Restore access':'Suspend access'}</button><small role="status">{status}</small></div>;}
export function TicketForm({id,revision,status:ticketStatus}:{id:string;revision:number;status:string}){
 const {send,status,busy}=useAdminAction();return <form className="admin-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await send('tickets/'+id,{revision,status:f.get('status'),body:f.get('body')}))form.reset();}}>
 <label>Reply by email<textarea name="body" rows={6} maxLength={5000} placeholder="Leave blank to change status only."/></label><label>Ticket status<select name="status" defaultValue={ticketStatus}><option value="open">Open</option><option value="closed">Closed</option></select></label><button disabled={busy}>Save / send reply</button><p role="status">{status}</p><p>Replies are queued through the Jamloom email template. Delivery status appears in Site controls.</p></form>;
}
export function RetryNotifications(){const {send,status,busy}=useAdminAction();return <div><button disabled={busy} onClick={()=>send('notifications',{})}>Retry pending email</button><p role="status">{status}</p></div>;}
