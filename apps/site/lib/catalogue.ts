import type { Pool, PoolClient } from 'pg';
import { AudioError, STRATEGIES, uuid, MOODS, publicationInput } from './audio-validation';
import type { PrivateAudio } from './private-audio';

export { MOODS } from './audio-validation';
function text(value:unknown,max:number,multiline=false) {
  if(typeof value!=='string' || !value.trim() || value.length>max || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(value)) throw new AudioError('Invalid text.');
  return value.trim();
}
export type PublicTrack={id:string;title:string;strategy:string;duration_ms:number;artist:string;description:string;mood:string};
const publicFields='t.id,t.title,t.strategy,t.duration_ms,c.artist,c.description,c.mood';
const publicJoin=`FROM catalogue_submissions c JOIN tracks t ON t.id=c.track_id JOIN track_assets a ON a.track_id=t.id
  WHERE c.state='approved' AND t.deleted_at IS NULL AND a.state='ready'`;

export class Catalogue {
  constructor(private pool:Pool,private audio:PrivateAudio) {}
  async list(query='',strategy='',mood='',after='') {
    if(query.length>80 || (strategy && !STRATEGIES.includes(strategy as typeof STRATEGIES[number])) || (mood && !MOODS.includes(mood))) throw new AudioError('Invalid catalogue filter.');
    if(after)uuid(after);
    const match='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
    const rows=(await this.pool.query<PublicTrack>(`SELECT ${publicFields} ${publicJoin}
      AND ($1='' OR t.strategy=$1) AND ($2='' OR c.mood=$2)
      AND (t.title ILIKE $3 OR c.artist ILIKE $3 OR c.description ILIKE $3)
      AND ($4::uuid IS NULL OR t.id>$4::uuid) ORDER BY t.id LIMIT 25`,[strategy,mood,match,after||null])).rows;
    return {tracks:rows.slice(0,24),next:rows.length>24?rows[23].id:null};
  }
  async latest() {
    return (await this.pool.query<PublicTrack>(`SELECT ${publicFields} ${publicJoin} ORDER BY c.reviewed_at DESC,t.id DESC LIMIT 8`)).rows;
  }
  async track(id:string, db:Pool|PoolClient=this.pool) {
    uuid(id);const row=(await db.query<PublicTrack>(`SELECT ${publicFields} ${publicJoin} AND t.id=$1`,[id])).rows[0];
    if(!row)throw new AudioError('Track not found.',404);return row;
  }
  async playback(id:string) {
    await this.track(id);
    // Recheck approval while holding the owner's same lock used by removal/review.
    const owner=(await this.pool.query('SELECT owner_id FROM tracks WHERE id=$1',[id])).rows[0]?.owner_id;
    return this.audio.locked(owner,async db=>{
      const row=(await db.query(`SELECT a.bytes ${publicJoin} AND t.id=$1`,[id])).rows[0];
      if(!row)throw new AudioError('Track not found.',404);
      return this.audio.store.local?{data:await this.audio.store.get(`masters/${id}.wav`,row.bytes)}:{url:await this.audio.store.playbackURL(`masters/${id}.wav`)};
    });
  }
  async submit(owner:string,id:string,value:Record<string,unknown>) {
    uuid(id);
    const {artist,description,mood}=publicationInput(value);
    await this.audio.locked(owner,async db=>{
      if(!(await db.query("SELECT t.id FROM tracks t JOIN track_assets a ON a.track_id=t.id WHERE t.id=$1 AND t.owner_id=$2 AND t.deleted_at IS NULL AND a.state='ready'",[id,owner])).rowCount)throw new AudioError('Track not found.',404);
      await db.query(`INSERT INTO catalogue_submissions(track_id,artist,description,mood) VALUES($1,$2,$3,$4)
        ON CONFLICT(track_id) DO UPDATE SET artist=$2,description=$3,mood=$4,state='submitted',revision=gen_random_uuid(),consent_at=now(),updated_at=now(),reviewer_id=NULL,reviewed_at=NULL,review_note=NULL`,[id,artist,description,mood]);
    });
    return {state:'submitted'};
  }
  async withdraw(owner:string,id:string) {
    uuid(id);await this.audio.locked(owner,async db=>{
      if(!(await db.query('SELECT id FROM tracks WHERE id=$1 AND owner_id=$2',[id,owner])).rowCount)throw new AudioError('Track not found.',404);
      await db.query("UPDATE catalogue_submissions SET state='withdrawn',revision=gen_random_uuid(),updated_at=now() WHERE track_id=$1",[id]);
    });return {state:'withdrawn'};
  }
  async submissions(owner:string) {
    return (await this.pool.query(`SELECT t.id,t.title,c.state,c.review_note FROM tracks t JOIN catalogue_submissions c ON c.track_id=t.id WHERE t.owner_id=$1 AND t.deleted_at IS NULL ORDER BY c.updated_at DESC LIMIT 50`,[owner])).rows;
  }
  async queue() {
    return (await this.pool.query(`SELECT ${publicFields},c.state,c.updated_at,c.revision,
      ARRAY(SELECT reason FROM catalogue_reports r WHERE r.track_id=t.id AND NOT r.resolved ORDER BY r.created_at,r.reporter_id LIMIT 10) AS reasons,
      (SELECT count(*)::int FROM catalogue_reports r WHERE r.track_id=t.id AND NOT r.resolved) AS reports
      FROM catalogue_submissions c JOIN tracks t ON t.id=c.track_id JOIN track_assets a ON a.track_id=t.id
      WHERE t.deleted_at IS NULL AND a.state='ready' AND c.state IN ('submitted','approved') AND (c.state='submitted' OR EXISTS(SELECT 1 FROM catalogue_reports r WHERE r.track_id=t.id AND NOT r.resolved))
      ORDER BY c.updated_at,t.id LIMIT 50`)).rows;
  }
  async review(reviewer:string,id:string,decision:unknown,note:unknown,revision:unknown) {
    uuid(id);if(!['approved','rejected'].includes(decision as string))throw new AudioError('Invalid review decision.');
    uuid(revision);
    const reason=text(note,500,true);
    const owner=(await this.pool.query('SELECT owner_id FROM tracks WHERE id=$1',[id])).rows[0]?.owner_id;
    if(!owner)throw new AudioError('Track not found.',404);
    if(owner===reviewer)throw new AudioError('A different reviewer must assess this submission.',403);
    await this.audio.locked(owner,async db=>{
      const row=(await db.query(`SELECT c.state,c.revision FROM catalogue_submissions c JOIN tracks t ON t.id=c.track_id JOIN track_assets a ON a.track_id=t.id
        WHERE t.id=$1 AND t.deleted_at IS NULL AND a.state='ready'`,[id])).rows[0];
      if(!row || row.revision!==revision || !['submitted','approved'].includes(row.state))throw new AudioError('Submission changed or is no longer reviewable. Reload the queue.',409);
      await db.query('UPDATE catalogue_submissions SET state=$2,reviewer_id=$3,reviewed_at=now(),updated_at=now(),review_note=$4,revision=gen_random_uuid() WHERE track_id=$1',[id,decision,reviewer,reason]);
      await db.query('INSERT INTO catalogue_reviews(track_id,revision,reviewer_id,decision,note) VALUES($1,$2,$3,$4,$5)',[id,revision,reviewer,decision,reason]);
      await db.query(`UPDATE catalogue_reports SET resolved=true WHERE track_id=$1 AND reporter_id IN (
        SELECT reporter_id FROM catalogue_reports WHERE track_id=$1 AND NOT resolved ORDER BY created_at,reporter_id LIMIT 10
      )`,[id]);
    });return {state:decision};
  }
  async report(reporter:string,id:string,reason:unknown) {
    const message=text(reason,500,true);await this.track(id);
    const owner=(await this.pool.query('SELECT owner_id FROM tracks WHERE id=$1',[id])).rows[0]?.owner_id;
    if(!owner)throw new AudioError('Track not found.',404);
    await this.audio.locked([reporter,owner],async db=>{
      await this.track(id,db);
      const count=(await db.query("SELECT count(*)::int n FROM catalogue_reports WHERE reporter_id=$1 AND created_at>now()-interval '24 hours'",[reporter])).rows[0].n;
      if(count>=10)throw new AudioError('Report limit reached. Try again later.',429);
      await db.query('UPDATE catalogue_submissions SET revision=gen_random_uuid() WHERE track_id=$1',[id]);
      await db.query(`INSERT INTO catalogue_reports(track_id,reporter_id,reason) VALUES($1,$2,$3)
        ON CONFLICT(track_id,reporter_id) DO UPDATE SET reason=$3,resolved=false,created_at=now()`,[id,reporter,message]);
    });return {reported:true};
  }
  async playlists(owner:string) {
    return (await this.pool.query('SELECT id,title FROM playlists WHERE owner_id=$1 ORDER BY created_at,id LIMIT 20',[owner])).rows;
  }
  async createPlaylist(owner:string,title:unknown) {
    const name=text(title,80);return this.audio.locked(owner,async db=>{
      if((await db.query('SELECT count(*)::int n FROM playlists WHERE owner_id=$1',[owner])).rows[0].n>=20)throw new AudioError('Playlist limit reached.',429);
      return (await db.query('INSERT INTO playlists(owner_id,title) VALUES($1,$2) RETURNING id,title',[owner,name])).rows[0];
    });
  }
  async playlist(owner:string,id:string) {
    uuid(id);const playlist=(await this.pool.query<{id:string;title:string}>('SELECT id,title FROM playlists WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0];
    if(!playlist)throw new AudioError('Playlist not found.',404);
    const items=(await this.pool.query<{id:string;track:PublicTrack|null}>(`SELECT i.track_id AS id,
      CASE WHEN c.state='approved' AND t.deleted_at IS NULL AND a.state='ready' THEN
        json_build_object('id',t.id,'title',t.title,'strategy',t.strategy,'duration_ms',t.duration_ms,
          'artist',c.artist,'description',c.description,'mood',c.mood) END AS track
      FROM playlist_items i JOIN tracks t ON t.id=i.track_id
      LEFT JOIN catalogue_submissions c ON c.track_id=t.id LEFT JOIN track_assets a ON a.track_id=t.id
      WHERE i.playlist_id=$1 ORDER BY i.added_at,t.id LIMIT 100`,[id])).rows;
    return {...playlist,tracks:items.flatMap(item=>item.track?[item.track]:[]),
      unavailable:items.filter(item=>!item.track).map(({id})=>({id}))};
  }
  async changePlaylist(owner:string,id:string,track:string|undefined,remove=false) {
    uuid(id);if(track)uuid(track);
    return this.audio.locked(owner,async db=>{
      if(!(await db.query('SELECT id FROM playlists WHERE id=$1 AND owner_id=$2',[id,owner])).rowCount)throw new AudioError('Playlist not found.',404);
      if(!track && remove) {await db.query('DELETE FROM playlists WHERE id=$1',[id]);return {removed:true};}
      if(!track)throw new AudioError('Choose a track.');
      if(remove)await db.query('DELETE FROM playlist_items WHERE playlist_id=$1 AND track_id=$2',[id,track]);
      else {
        await this.track(track,db);
        const usage=(await db.query('SELECT count(*)::int n,bool_or(track_id=$2) present FROM playlist_items WHERE playlist_id=$1',[id,track])).rows[0];
        if(usage.n>=100&&!usage.present)throw new AudioError('Playlist is full.',429);
        await db.query('INSERT INTO playlist_items(playlist_id,track_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,track]);
      }
      return {saved:true};
    });
  }
}
