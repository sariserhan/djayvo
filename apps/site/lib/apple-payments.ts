import { Environment,SignedDataVerifier,Type, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import {CREDIT_PACKS} from './economics';
import {Wallet} from './wallet';
const products={
 'com.jamloom.credits.starter':CREDIT_PACKS.starter,
 'com.jamloom.credits.creator':CREDIT_PACKS.creator,
 'com.jamloom.credits.studio':CREDIT_PACKS.studio,
};
export function sandboxApple(env:Record<string,string|undefined>=process.env){
 const bundle=env.APPLE_BUNDLE_ID,roots=env.APPLE_ROOT_CERTIFICATES_BASE64;
 if(!bundle||!roots||roots.length>32000)throw new Error('Apple sandbox verification not configured');
 const certs=roots.split(',').map(s=>Buffer.from(s,'base64'));if(certs.length>4||certs.some(c=>c.length<100||c.length>8000))throw new Error('Invalid Apple root configuration');
 return new SignedDataVerifier(certs,true,Environment.SANDBOX,bundle,undefined);
}
// This validator accepts only the output of Apple's independent JWS verifier.
export function applePurchase(transaction:JWSTransactionDecodedPayload,token:string,bundle:string){
 const pack=products[transaction.productId as keyof typeof products];
 if(transaction.environment!==Environment.SANDBOX||transaction.bundleId!==bundle||transaction.type!==Type.CONSUMABLE||
 transaction.quantity!==1||transaction.inAppOwnershipType!=='PURCHASED'||transaction.revocationDate!==undefined||transaction.revocationReason!==undefined||
 transaction.appAccountToken?.toLowerCase()!==token.toLowerCase()||!pack||!transaction.transactionId||
 transaction.currency!=='USD'||transaction.price!==pack.cents*10||transaction.offerType!==undefined)throw new Error('Unsupported Apple transaction');
 // Apple's price is milliunits of currency. Sandbox-only 40% conservative net allowance.
 return {provider:'apple_sandbox' as const,receipt:transaction.transactionId,credits:pack.credits,netMicros:Math.floor(pack.cents*10000*.4)};
}
export async function fulfillApple(verifier:SignedDataVerifier,wallet:Wallet,owner:string,jws:string,bundle:string){
 const transaction=await verifier.verifyAndDecodeTransaction(jws);
 const token=await wallet.accountToken(owner);
 return wallet.grant(owner,applePurchase(transaction,token,bundle));
}

// Only independently verified sandbox refund notifications may remove credits.
export async function reconcileAppleNotification(verifier:Pick<SignedDataVerifier,'verifyAndDecodeNotification'|'verifyAndDecodeTransaction'>,
 wallet:Pick<Wallet,'freezePurchase'>,signedPayload:string,bundle:string){
 const notice=await verifier.verifyAndDecodeNotification(signedPayload);
 if(notice.version!=='2.0'||typeof notice.notificationUUID!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notice.notificationUUID)||typeof notice.notificationType!=='string'||!notice.notificationType||
    notice.data?.environment!==Environment.SANDBOX||notice.data.bundleId!==bundle)throw new Error('Invalid Apple notification');
 if(notice.notificationType==='REFUND'){
  if(!notice.data.signedTransactionInfo)throw new Error('Missing refund transaction');
  const tx=await verifier.verifyAndDecodeTransaction(notice.data.signedTransactionInfo);
  if(tx.environment!==Environment.SANDBOX||tx.bundleId!==bundle||tx.type!==Type.CONSUMABLE||
     !products[tx.productId as keyof typeof products]||!tx.transactionId||tx.transactionId.length>255||
     !Number.isSafeInteger(tx.revocationDate)||(tx.revocationDate??0)<=0)throw new Error('Invalid refund transaction');
  await wallet.freezePurchase('apple_sandbox',tx.transactionId);
 }
 // A refund reversal requires reviewed ledger reconciliation; never mint replacement credits here.
 return {id:notice.notificationUUID,type:notice.notificationType,manualReview:notice.notificationType==='REFUND_REVERSED'};
}
