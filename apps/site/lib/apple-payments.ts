import { Environment,SignedDataVerifier,Type, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import {CREDIT_PACKS} from './economics';
import {Wallet} from './wallet';
const products={
 'com.jamloom.credits.starter':CREDIT_PACKS.starter,
 'com.jamloom.credits.creator':CREDIT_PACKS.creator,
 'com.jamloom.credits.studio':CREDIT_PACKS.studio,
};
export type AppleEnvironment = Environment.SANDBOX | Environment.PRODUCTION;
export function appleEnvironment(env:Record<string,string|undefined>=process.env):AppleEnvironment{
 if(!env.APPLE_ENVIRONMENT||env.APPLE_ENVIRONMENT==='sandbox')return Environment.SANDBOX;
 if(env.APPLE_ENVIRONMENT!=='production'||env.CREDIT_BILLING_MODE!=='live'||!Number.isSafeInteger(Number(env.APPLE_APP_ID))||Number(env.APPLE_APP_ID)<=0)throw new Error('Apple production verification not configured');
 return Environment.PRODUCTION;
}
export function appleVerifier(env:Record<string,string|undefined>=process.env){
 const environment=appleEnvironment(env),bundle=env.APPLE_BUNDLE_ID,roots=env.APPLE_ROOT_CERTIFICATES_BASE64;
 if(!bundle||!roots||roots.length>32000)throw new Error('Apple verification not configured');
 const certs=roots.split(',').map(s=>Buffer.from(s,'base64'));if(certs.length>4||certs.some(c=>c.length<100||c.length>8000))throw new Error('Invalid Apple root configuration');
 return new SignedDataVerifier(certs,true,environment,bundle,environment===Environment.PRODUCTION?Number(env.APPLE_APP_ID):undefined);
}
// This validator accepts only the output of Apple's independent JWS verifier.
export function applePurchase(transaction:JWSTransactionDecodedPayload,token:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const pack=products[transaction.productId as keyof typeof products];
 if(transaction.environment!==environment||transaction.bundleId!==bundle||transaction.type!==Type.CONSUMABLE||
 transaction.quantity!==1||transaction.inAppOwnershipType!=='PURCHASED'||transaction.revocationDate!==undefined||transaction.revocationReason!==undefined||
 transaction.appAccountToken?.toLowerCase()!==token.toLowerCase()||!pack||!transaction.transactionId||
 transaction.currency!=='USD'||transaction.price!==pack.cents*10||transaction.offerType!==undefined)throw new Error('Unsupported Apple transaction');
 // Apple's price is milliunits; reserve 60% for platform fees, tax and settlement uncertainty.
 return {provider:environment===Environment.PRODUCTION?'apple_live' as const:'apple_sandbox' as const,receipt:transaction.transactionId,credits:pack.credits,netMicros:Math.floor(pack.cents*10000*.4)};
}
export async function fulfillApple(verifier:SignedDataVerifier,wallet:Wallet,owner:string,jws:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const transaction=await verifier.verifyAndDecodeTransaction(jws);
 const token=await wallet.accountToken(owner);
 return wallet.grant(owner,applePurchase(transaction,token,bundle,environment));
}

// Both notification and nested transaction must verify in the configured environment.
export async function reconcileAppleNotification(verifier:Pick<SignedDataVerifier,'verifyAndDecodeNotification'|'verifyAndDecodeTransaction'>,
 wallet:Pick<Wallet,'freezePurchase'>,signedPayload:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const notice=await verifier.verifyAndDecodeNotification(signedPayload);
 if(notice.version!=='2.0'||typeof notice.notificationUUID!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notice.notificationUUID)||typeof notice.notificationType!=='string'||!notice.notificationType||
    notice.data?.environment!==environment||notice.data.bundleId!==bundle)throw new Error('Invalid Apple notification');
 if(notice.notificationType==='REFUND'){
  if(!notice.data.signedTransactionInfo)throw new Error('Missing refund transaction');
  const tx=await verifier.verifyAndDecodeTransaction(notice.data.signedTransactionInfo);
  if(tx.environment!==environment||tx.bundleId!==bundle||tx.type!==Type.CONSUMABLE||
     !products[tx.productId as keyof typeof products]||!tx.transactionId||tx.transactionId.length>255||
     !Number.isSafeInteger(tx.revocationDate)||(tx.revocationDate??0)<=0)throw new Error('Invalid refund transaction');
  await wallet.freezePurchase(environment===Environment.PRODUCTION?'apple_live':'apple_sandbox',tx.transactionId);
 }
 // A refund reversal requires reviewed ledger reconciliation; never mint replacement credits here.
 return {id:notice.notificationUUID,type:notice.notificationType,manualReview:notice.notificationType==='REFUND_REVERSED'};
}
