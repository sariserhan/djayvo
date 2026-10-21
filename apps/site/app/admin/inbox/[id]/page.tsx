import {notFound} from 'next/navigation';import {requireAdmin} from '../../../../lib/admin-page';import {TicketForm} from '../../forms';
export default async function Ticket({params}:{params:Promise<{id:string}>}){
 const {pool}=await requireAdmin(),{id}=await params;if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))notFound();
 const ticket=(await pool.query('SELECT * FROM support_tickets WHERE id=$1',[id])).rows[0];if(!ticket)notFound();const replies=(await pool.query('SELECT id,body,created_at FROM support_replies WHERE ticket_id=$1 ORDER BY created_at',[id])).rows;
 return <><a href="/admin/inbox">← Inbox</a><h1>{ticket.subject}</h1><p>{ticket.kind} · {ticket.status} · {ticket.name} &lt;{ticket.email}&gt;</p><p className="admin-message">{ticket.body}</p><small>Reference: {ticket.id}</small><h2>Replies</h2>{replies.map(r=><article key={r.id}><time>{new Date(r.created_at).toISOString()}</time><p className="admin-message">{r.body}</p></article>)}<TicketForm key={ticket.revision} id={id} revision={ticket.revision} status={ticket.status}/></>;
}
