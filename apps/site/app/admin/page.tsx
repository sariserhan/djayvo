import {comingSoonEnabled} from '../../lib/coming-soon';
import {requireAdmin} from '../../lib/admin-page';import {siteSettings} from '../../lib/site-settings';import {billingReadiness} from '../../lib/billing-mode';import {SettingsForm,RetryNotifications} from './forms';
export default async function Admin(){
 const {pool}=await requireAdmin();const settings=await siteSettings(pool);
 const counts=(await pool.query(`SELECT (SELECT count(*) FROM "user") AS users,(SELECT count(*) FROM support_tickets WHERE status='open') AS tickets,(SELECT count(*) FROM notification_outbox WHERE sent_at IS NULL) AS pending,(SELECT count(*) FROM notification_outbox WHERE sent_at IS NULL AND last_error IS NOT NULL) AS failed`)).rows[0];
 const audit=(await pool.query('SELECT action,target,created_at FROM admin_audit ORDER BY id DESC LIMIT 20')).rows;
 const emails=(await pool.query('SELECT message->>\'subject\' AS subject,attempts,last_error,created_at FROM notification_outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20')).rows;
 return <><h1>Site controls</h1><p>Public access: {comingSoonEnabled()?'Coming soon — verified admin preview only.':'Open, subject to maintenance and product release settings.'}</p><div className="admin-stats"><p><strong>{counts.users}</strong> Accounts</p><p><strong>{counts.tickets}</strong> Open messages</p><p><strong>{counts.pending}</strong> Pending emails</p><p><strong>{counts.failed}</strong> Delivery failures</p></div>
 <SettingsForm settings={settings} liveConfigured={billingReadiness('live').configured}/>
 <h2>Community music</h2><p>Public creations appear on the homepage only after permission and listening review. You cannot approve your own submissions.</p><a href="/review">Review submitted music →</a>
 <h2>Email delivery</h2><p>Signup, contact and support notifications go to serhan.sari@yahoo.com. An accepted email is not proof that it reached the inbox.</p><RetryNotifications/>{emails.map((m,i)=><p key={i}>{m.subject} · {m.attempts} attempts · {m.last_error??'Queued'}</p>)}
 <h2>Recent admin actions</h2><ul className="admin-list">{audit.map((r,i)=><li key={i}><strong>{r.action}</strong> · {r.target}<br/><time>{new Date(r.created_at).toISOString()}</time></li>)}</ul></>;
}
