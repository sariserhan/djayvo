'use client';
import {useState} from 'react';
export function DeleteAccount({pending}:{pending:boolean}){
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[received,setReceived]=useState(pending),[message,setMessage]=useState('');
 return <details><summary>Delete account</summary>
  <p>Request deletion of your account and associated online data. Support reviews requests and confirms timing and completion by email. Required financial records may be retained. Local recordings on your devices are managed separately.</p>
  {received?<p role="status">Deletion request received. Awaiting review; your account has not been deleted yet.</p>:<form onSubmit={async event=>{
   event.preventDefault();if(busy||!confirm)return;setBusy(true);setMessage('');
   try{const response=await fetch('/api/account/deletion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});const result=await response.json();if(!response.ok)throw Error(result.error??'Please try again.');if(!result.request?.id||result.request.status!=='open')throw Error('Request was not confirmed.');setReceived(true);}
   catch(error){setMessage(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
  }}><label><input type="checkbox" checked={confirm} onChange={event=>setConfirm(event.target.checked)} disabled={busy}/> I want to request deletion of my signed-in account.</label><button className="secondary" disabled={busy||!confirm}>{busy?'Sending…':'Send deletion request'}</button></form>}
  {message&&<p role="alert">{message}</p>}
 </details>;
}
