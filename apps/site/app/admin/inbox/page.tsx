import {requireAdmin,pageNumber} from '../../../lib/admin-page';
export default async function Inbox({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {pool}=await requireAdmin(),query=await searchParams,status=['open','closed'].includes(query.status??'')?query.status!:'open',page=pageNumber(query.page);
 const rows=(await pool.query('SELECT id,kind,name,subject,created_at FROM support_tickets WHERE status=$1 ORDER BY created_at DESC,id LIMIT 51 OFFSET $2',[status,(page-1)*50])).rows;
 return <><h1>Contact &amp; support inbox</h1><nav aria-label="Message status"><a href="/admin/inbox?status=open">Open</a> · <a href="/admin/inbox?status=closed">Closed</a></nav>{!rows.length&&<p>No {status} messages.</p>}<ul className="admin-list">{rows.slice(0,50).map(r=><li key={r.id}><a href={'/admin/inbox/'+r.id}>{r.subject}</a><p>{r.kind} · {r.name} · {new Date(r.created_at).toISOString()}</p></li>)}</ul><nav aria-label="Message pages">{page>1&&<a href={`?status=${status}&page=${page-1}`}>Previous</a>} {rows.length>50&&<a href={`?status=${status}&page=${page+1}`}>Next</a>}</nav></>;
}
