import type {Pool,PoolClient} from 'pg';
export const OWNER_EMAIL='serhan.sari@yahoo.com';
export function isAdmin(user:{email:string;emailVerified:boolean}|null|undefined){
 return !!user?.emailVerified&&user.email.toLowerCase()===OWNER_EMAIL;
}
export async function adminAccount(db:Pool|PoolClient,id:string){
 return !!(await db.query('SELECT 1 FROM "user" WHERE id=$1 AND lower(email)=$2 AND "emailVerified" AND NOT suspended',[id,OWNER_EMAIL])).rowCount;
}
