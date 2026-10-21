import {requireAdmin} from '../../lib/admin-page';
export const dynamic='force-dynamic';
export const metadata={title:'Administration',robots:{index:false,follow:false}};
export default async function AdminLayout({children}:{children:React.ReactNode}){
 await requireAdmin();return <section className="admin-shell"><p className="eyebrow">Jamloom / Owner workspace</p><nav className="admin-nav" aria-label="Administration"><a href="/admin">Site controls</a><a href="/admin/users">Users</a><a href="/admin/inbox">Inbox</a><a href="/admin/billing">Billing</a></nav>{children}</section>;
}
