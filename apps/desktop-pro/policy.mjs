import path from 'node:path';
export const ORIGIN='jamloom://studio';
export const CATALOGUE='https://www.jamloom.com';
export const UPDATE_FEED='https://github.com/sariserhan/jamloom/releases/download/pro-updates/releases.json';
export function trusted(url){try{const u=new URL(url);return u.protocol==='jamloom:'&&u.hostname==='studio'&&!u.port&&!u.username&&!u.password;}catch{return false;}}
export function assetPath(url,root){
  if(!trusted(url))return null;
  const name=decodeURIComponent(new URL(url).pathname);
  if(!/^\/[a-zA-Z0-9_./-]+$/.test(name)||name.split('/').some(p=>p==='..'||p.startsWith('.')))return null;
  return path.join(root,name);
}
export function cataloguePath(url){return /^\/api\/aurowall(?:\/[a-f0-9]{24})?$/.test(url);}
export function settings(value){return {catalogue:value?.catalogue!==false,automaticUpdates:value?.automaticUpdates===true};}
export function permissionAllowed(permission,details={}){
  if(permission==='media')return details.mediaTypes?.length===1&&details.mediaTypes[0]==='audio';
  // Chromium requests the midiSysex permission even for the studio's sysex:false MIDI input request.
  return ['midi','midiSysex','speaker-selection','fullscreen'].includes(permission);
}
export const CSP="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

export const detachable = url => trusted(url) && new URL(url).pathname === '/detached.html' && !new URL(url).search && !new URL(url).hash;
