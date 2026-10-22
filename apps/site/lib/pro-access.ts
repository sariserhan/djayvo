import type {Pool,PoolClient} from 'pg';
import {adminAccount} from './admin-access';
export async function proAccess(pool:Pool|PoolClient,owner:string,live=true){
 if(await adminAccount(pool,owner))return true;
 return !!(await pool.query('SELECT 1 FROM pro_purchases p JOIN "user" u ON u.id=p.owner_id WHERE NOT u.suspended AND u."emailVerified" AND p.owner_id=$1 AND sandbox=$2 AND NOT refund_hold AND NOT dispute_hold LIMIT 1',[owner,!live])).rowCount;
}
