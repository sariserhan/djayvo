import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Config } from './config';
import { AudioError, readBody } from './audio-validation';

export interface AudioStore {
  local: boolean;
  put(key: string, data: Buffer): Promise<void>;
  get(key: string, limit: number): Promise<Buffer>;
  remove(key: string): Promise<void>;
  uploadURL(key: string, bytes: number, seconds: number): Promise<string>;
  playbackURL(key: string, download?: boolean, seconds?: number): Promise<string>;
}
export function localAudioStore(directory: string): AudioStore {
  if (!isAbsolute(directory)) throw new Error('An absolute private audio directory is required.');
  const path = (key: string) => {
    if (!/^(uploads|masters)\/[a-f0-9-]{36}\.wav$/.test(key)&&!/^(music-dna|improvise|dj-studio|live-dj|academy)\/(public|private)\/[a-f0-9-]{32,36}\/[a-f0-9]{64}\.wav$/.test(key)) throw new Error('Invalid object key.');
    return join(directory,key);
  };
  return {
    local: true,
    async put(key,data) {
      const target=path(key); await mkdir(dirname(target),{recursive:true,mode:0o700});
      const temp=target+'.'+randomUUID();
      try { await writeFile(temp,data,{flag:'wx',mode:0o600}); await rename(temp,target); }
      finally { await rm(temp,{force:true}); }
    },
    async get(key,limit) {
      const file=path(key);
      if ((await stat(file)).size>limit) throw new AudioError('Upload is too large.',413);
      const data=await readFile(file); if (data.length>limit) throw new AudioError('Upload is too large.',413);
      return data;
    },
    async remove(key) { await rm(path(key),{force:true}); },
    async uploadURL(key) { return '/api/library/'+key.split('/')[1].slice(0,-4)+'/upload'; },
    async playbackURL(key) { return '/api/library/'+key.split('/')[1].slice(0,-4)+'/audio'; },
  };
}
export function audioStore(config: Config, env: Record<string,string|undefined> = process.env): AudioStore | null {
  const directory = env.JAMLOOM_LOCAL_AUDIO_DIR ?? env.DJAYVO_LOCAL_AUDIO_DIR;
  if (directory) {
    if (!config.local || env.VERCEL) throw new Error('Local audio storage is forbidden on hosted environments.');
    return localAudioStore(directory);
  }
  if ((env.JAMLOOM_R2_ENABLED ?? env.DJAYVO_R2_ENABLED) !== 'true') return null;
  return r2AudioStore(env);
}
export function r2AudioStore(env: Record<string,string|undefined> = process.env): AudioStore {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: access, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET: bucket }=env;
  if (!account || !/^[a-f0-9]{32}$/.test(account) || !access || !secret || !bucket || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('R2 configuration is incomplete.');
  const client=new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,forcePathStyle:true,
    credentials:{accessKeyId:access,secretAccessKey:secret},maxAttempts:1,
    requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
  return {
    local:false,
    async put(key,data) { await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:data,ContentType:'audio/wav',CacheControl:'private, no-store'}),{abortSignal:AbortSignal.timeout(15000)}); },
    async get(key,limit) {
      const result=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});
      const body=result.Body?.transformToWebStream();
      if (!body) throw new AudioError('Upload is missing.');
      if (!result.ContentLength || result.ContentLength>Math.min(limit,24_000_000)) { await body.cancel(); throw new AudioError('Invalid upload size.'); }
      return readBody(body,limit);
    },
    async remove(key) { await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)}); },
    uploadURL: (key,bytes,seconds) => getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:'audio/wav',ContentLength:bytes}),{expiresIn:seconds,signableHeaders:new Set(['content-type','content-length'])}),
    playbackURL: (key,download=false,seconds=60) => getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key,ResponseCacheControl:'private, no-store',ResponseContentDisposition:`${download?'attachment':'inline'}; filename="jamloom-mix.wav"`}),{expiresIn:seconds}),
  };
}
