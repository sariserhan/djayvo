import {createPrivateKey,sign} from 'node:crypto';
import {verifyLicense,PRO_PRODUCT,LEASE_SECONDS,publicKey} from '../../desktop-pro/license.mjs';
export {verifyLicense};
export function issueProLicense(subject:string,sandbox=false,env:Record<string,string|undefined>=process.env,now=Math.floor(Date.now()/1000),verificationKey=publicKey){
 const key=createPrivateKey(Buffer.from(env.PRO_LICENSE_PRIVATE_KEY??'','base64').toString());
 const payload={v:1,product:PRO_PRODUCT,subject,sandbox,issued:now,expires:now+LEASE_SECONDS};
 const data=Buffer.from(JSON.stringify(payload)),token=data.toString('base64url')+'.'+sign(null,data,key).toString('base64url');
 if(!verifyLicense(token,{now,key:verificationKey}))throw Error('License signing key does not match the app');
 return token;
}
