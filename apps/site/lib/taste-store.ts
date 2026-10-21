import type {Pool} from 'pg';import {validateTaste} from './taste';import {integer} from './economics';
export class TasteStore {
 constructor(private pool:Pool){}
 async load(owner:string){return (await this.pool.query('SELECT profile,revision FROM taste_profiles WHERE owner_id=$1',[owner])).rows[0]??null;}
 async save(owner:string,profile:unknown,revision:number){integer(revision,0,2147483646);const value=validateTaste(profile);
  const result=revision===0?await this.pool.query('INSERT INTO taste_profiles(owner_id,profile) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING revision',[owner,JSON.stringify(value)]):
   await this.pool.query("UPDATE taste_profiles SET profile=$1,revision=nextval('taste_profile_revision'),updated_at=now() WHERE owner_id=$2 AND revision=$3 RETURNING revision",[JSON.stringify(value),owner,revision]);
  if(!result.rowCount)throw new Error('Profile changed. Load the account version before saving.');return result.rows[0].revision as number;
 }
 async remove(owner:string,revision:number){integer(revision,1,2147483647);const result=await this.pool.query('DELETE FROM taste_profiles WHERE owner_id=$1 AND revision=$2',[owner,revision]);if(!result.rowCount)throw new Error('Profile changed or already removed. Reload before deleting.');}
}
