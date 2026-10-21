import {createHmac,timingSafeEqual} from 'node:crypto';
import {integer} from './economics';
import type {JobBudget} from './wallet';
import {validatePermit} from './generation-budget';

export type GenerationQuote={version:1;owner:string;expiresAt:number;credits:number;costCapMicros:number;
 marginBps:number;visibility:'public'|'private';job:JobBudget};
function validate(q:GenerationQuote,owner:string,now:number){
 if(q.version!==1||q.owner!==owner||!owner||owner.length>255||!['public','private'].includes(q.visibility))throw new Error('Invalid quote identity');
 integer(q.expiresAt,now+1,now+300000);integer(q.credits,0,100000);integer(q.marginBps,3000,9000);
 validatePermit({...q.job,version:1,reservationId:'00000000-0000-0000-0000-000000000000',expiresAt:now+60000,costCapMicros:q.costCapMicros,attempt:1},now);
}
export function signQuote(q:GenerationQuote,secret:string,now=Date.now()){
 if(secret.length<32)throw new Error('Quote secret missing');validate(q,q.owner,now);
 const body=Buffer.from(JSON.stringify(q)).toString('base64url');
 return body+'.'+createHmac('sha256',secret).update('quote:'+body).digest('hex');
}
export function verifyQuote(token:string,owner:string,secret:string,now=Date.now()){
 if(typeof token!=='string'||token.length>4096||secret.length<32)throw new Error('Invalid quote');
 const [body,mac,...extra]=token.split('.');
 if(extra.length||!/^[a-f0-9]{64}$/.test(mac??''))throw new Error('Invalid quote');
 if(!timingSafeEqual(Buffer.from(mac,'hex'),createHmac('sha256',secret).update('quote:'+body).digest()))throw new Error('Invalid quote');
 const q=JSON.parse(Buffer.from(body,'base64url').toString()) as GenerationQuote;validate(q,owner,now);return q;
}
