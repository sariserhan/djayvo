import {verify,createPublicKey} from 'node:crypto';
export const PRO_PRODUCT='jamloom-pro-v1',LEASE_SECONDS=30*86400;
export const publicKey=createPublicKey('-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA3eQHuVNuRI/yKKcRtfgu+0RsnTk2GUbaui3en1zdtiY=\n-----END PUBLIC KEY-----\n');
export function verifyLicense(token,{now=Math.floor(Date.now()/1000),allowExpired=false,key=publicKey}={}){
 try{
  if(typeof token!=='string'||token.length>4096)return null;
  const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))return null;
  const data=Buffer.from(parts[0],'base64url'),sig=Buffer.from(parts[1],'base64url');
  if(sig.length!==64||!verify(null,data,key,sig))return null;
  const v=JSON.parse(data.toString('utf8'));
  if(Object.keys(v).sort().join(',')!=='expires,issued,product,sandbox,subject,v'||v.v!==1||v.product!==PRO_PRODUCT||typeof v.subject!=='string'||v.subject.length<1||v.subject.length>200||typeof v.sandbox!=='boolean'||!Number.isSafeInteger(v.issued)||v.issued<0||!Number.isSafeInteger(v.expires)||v.expires-v.issued!==LEASE_SECONDS||v.issued>now+300||now>=v.expires+(allowExpired?90*86400:0))return null;
  return v;
 }catch{return null;}
}
