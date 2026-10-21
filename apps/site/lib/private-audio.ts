import type { Pool, PoolClient } from 'pg';
import type { AudioStore } from './audio-store';
import { AudioError, saveInput, uuid, validateWav } from './audio-validation';

type Asset = { track_id:string; owner_id:string; bytes:number; sha256:string; state:string; expires_at:Date; staging_cleaned:boolean; publication:ReturnType<typeof saveInput>['publication'] };
export const storageLimits={tracks:10, ownerBytes:100*1024**2, totalBytes:1024**3, ownerDaily:20, totalDaily:500};
const key=(id:string, master=false) => `${master?'masters':'uploads'}/${id}.wav`;

export class PrivateAudio {
  constructor(private pool:Pool, public store:AudioStore) {}
  async locked<T>(owner:string|string[], action:(db:PoolClient)=>Promise<T>, reservation=false) {
    const db=await this.pool.connect();
    try {
      await db.query('BEGIN');
      if (reservation) await db.query('SELECT pg_advisory_xact_lock(90418274)');
      const owners=[...new Set(Array.isArray(owner)?owner:[owner])];
      // Stable order prevents reciprocal-report deadlocks; foreign-key reads remain compatible.
      if (!owners.length || (await db.query('SELECT id FROM "user" WHERE id=ANY($1::text[]) ORDER BY id FOR NO KEY UPDATE',[owners])).rowCount!==owners.length) throw new AudioError('Sign in required.',401);
      const result=await action(db); await db.query('COMMIT'); return result;
    } catch(error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  private async asset(db:PoolClient,owner:string,id:string) {
    uuid(id);
    const row=(await db.query<Asset>('SELECT * FROM track_assets WHERE track_id=$1 AND owner_id=$2',[id,owner])).rows[0];
    if (!row) throw new AudioError('Track not found.',404);
    return row;
  }
  private uploading(row:Asset) {
    if (row.state!=='uploading' || row.expires_at.getTime()<=Date.now()) throw new AudioError('Upload expired or no longer available. Choose the file again.',409);
  }
  async reserve(owner:string,input:unknown) {
    const v=saveInput(input);
    return this.locked(owner,async db => {
      const existing=(await db.query<Asset & {title:string;strategy:string}>(`SELECT a.*,t.title,t.strategy FROM track_assets a JOIN tracks t ON t.id=a.track_id
        WHERE a.owner_id=$1 AND a.request_id=$2`,[owner,v.requestId])).rows[0];
      let row=existing;
      if (existing) {
        if (existing.bytes!==v.bytes || existing.sha256!==v.sha256 || existing.title!==v.title || existing.strategy!==v.strategy || JSON.stringify(existing.publication && {artist:existing.publication.artist,description:existing.publication.description,mood:existing.publication.mood,consent:true})!==JSON.stringify(v.publication)) throw new AudioError('Save request changed. Choose the file again.',409);
      } else {
        const usage=(await db.query(`SELECT count(*) FILTER (WHERE owner_id=$1 AND state<>'deleted')::int AS tracks,
          coalesce(sum(bytes*2::bigint) FILTER (WHERE owner_id=$1 AND state<>'deleted'),0)::text AS owner_bytes,
          coalesce(sum(bytes*2::bigint) FILTER (WHERE state<>'deleted'),0)::text AS total_bytes,
          count(*) FILTER (WHERE owner_id=$1 AND created_at>now()-interval '24 hours')::int AS owner_daily,
          count(*) FILTER (WHERE created_at>now()-interval '24 hours')::int AS total_daily FROM track_assets`,[owner])).rows[0];
        if (usage.tracks>=storageLimits.tracks || Number(usage.owner_bytes)+v.bytes*2>storageLimits.ownerBytes ||
            Number(usage.total_bytes)+v.bytes*2>storageLimits.totalBytes || usage.owner_daily>=storageLimits.ownerDaily || usage.total_daily>=storageLimits.totalDaily) {
          throw new AudioError('Account saving is at its limit. Your local mix is safe; try later or remove a saved mix.',429);
        }
        const track=(await db.query(`INSERT INTO tracks(owner_id,title,strategy,duration_ms) VALUES($1,$2,$3,$4) RETURNING id`,
          [owner,v.title,v.strategy,Math.round((v.bytes-44)/192)])).rows[0];
        row=(await db.query(`INSERT INTO track_assets(track_id,request_id,owner_id,sha256,bytes,publication) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
          [track.id,v.requestId,owner,v.sha256,v.bytes,v.publication?JSON.stringify(v.publication):null])).rows[0];
      }
      if (row.state==='ready') return {id:row.track_id,ready:true};
      this.uploading(row);
      const seconds=Math.max(1,Math.floor((row.expires_at.getTime()-Date.now())/1000));
      return {id:row.track_id,ready:false,url:await this.store.uploadURL(key(row.track_id),row.bytes,seconds),bytes:row.bytes};
    },true);
  }
  async localUpload(owner:string,id:string,data:Buffer) {
    if (!this.store.local) throw new AudioError('Use the authorized direct upload.',404);
    await this.locked(owner,async db => {
      const row=await this.asset(db,owner,id); this.uploading(row);
      validateWav(data,row.bytes,row.sha256);
      await this.store.put(key(id),data);
    });
  }
  async finalize(owner:string,id:string) {
    return this.locked(owner,async db => {
      const row=await this.asset(db,owner,id);
      if (row.state==='ready') return {id,ready:true};
      this.uploading(row);
      const data=await this.store.get(key(id),row.bytes);
      const duration=validateWav(data,row.bytes,row.sha256);
      // Retrying after a crash writes only the same checksum-bound bytes to the final key.
      await this.store.put(key(id,true),data);
      await db.query("UPDATE track_assets SET state='ready' WHERE track_id=$1",[id]);
      await db.query('UPDATE tracks SET duration_ms=$2 WHERE id=$1',[id,duration]);
      if(row.publication) await db.query(`INSERT INTO catalogue_submissions(track_id,artist,description,mood) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[id,row.publication.artist,row.publication.description,row.publication.mood]);
      return {id,ready:true};
    });
  }
  async playback(owner:string,id:string,download=false) {
    return this.locked(owner,async db => {
      const row=await this.asset(db,owner,id);
      if (row.state!=='ready') throw new AudioError('Track not found.',404);
      return this.store.local ? {data:await this.store.get(key(id,true),row.bytes)} : {url:await this.store.playbackURL(key(id,true),download)};
    });
  }
  async remove(owner:string,id:string) {
    await this.locked(owner,async db => {
      const row=await this.asset(db,owner,id);
      if (row.state==='deleted') return;
      await db.query("UPDATE track_assets SET state='deleting' WHERE track_id=$1",[id]);
      await db.query('UPDATE tracks SET deleted_at=coalesce(deleted_at,now()) WHERE id=$1',[id]);
    });
    return {removed:true,cleanup:'pending'};
  }
  async cleanup(limit=50) {
    if (!Number.isInteger(limit) || limit<1 || limit>100) throw new Error('Invalid cleanup limit.');
    const due=(await this.pool.query<Asset>(`SELECT * FROM track_assets WHERE state<>'deleted'
      AND (state<>'ready' OR NOT staging_cleaned) AND expires_at<now()-interval '1 minute'
      ORDER BY expires_at,track_id LIMIT $1`,[limit])).rows;
    let cleaned=0,failed=0;
    for (const item of due) {
      try {
        await this.locked(item.owner_id,async db => {
          const row=await this.asset(db,item.owner_id,item.track_id);
          if (row.state==='deleted' || row.expires_at.getTime()+60000>=Date.now()) return;
          await this.store.remove(key(row.track_id));
          if (row.state==='ready') await db.query('UPDATE track_assets SET staging_cleaned=true WHERE track_id=$1',[row.track_id]);
          else {
            await this.store.remove(key(row.track_id,true));
            await db.query('UPDATE tracks SET deleted_at=coalesce(deleted_at,now()) WHERE id=$1',[row.track_id]);
            await db.query("UPDATE track_assets SET state='deleted', staging_cleaned=true WHERE track_id=$1",[row.track_id]);
          }
          cleaned++;
        });
      } catch { failed++; }
    }
    return {checked:due.length,cleaned,failed};
  }
}
