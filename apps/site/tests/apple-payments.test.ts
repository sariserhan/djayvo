import test from 'node:test';import assert from 'node:assert/strict';
import {Environment,SignedDataVerifier,Type} from '@apple/app-store-server-library';
import {applePurchase,sandboxApple,reconcileAppleNotification} from '../lib/apple-payments';
test('Apple consumables bind exact app/account/product/price/environment, reject revocation and offers',()=>{
 const token='11111111-1111-4111-8111-111111111111',bundle='com.djayvo.app';
 const tx={transactionId:'123',bundleId:bundle,environment:Environment.SANDBOX,type:Type.CONSUMABLE,productId:'com.jamloom.credits.starter',appAccountToken:token,quantity:1,inAppOwnershipType:'PURCHASED',currency:'USD',price:9990};
 assert.deepEqual(applePurchase(tx,token,bundle),{provider:'apple_sandbox',receipt:'123',credits:10,netMicros:3996000});
 for(const patch of [{bundleId:'com.other'},{environment:Environment.PRODUCTION},{appAccountToken:'wrong'},{productId:'unknown'},{revocationDate:1},{revocationReason:0},{price:1},{quantity:2},{currency:'EUR'},{offerType:1}])assert.throws(()=>applePurchase({...tx,...patch},token,bundle));
 assert.throws(()=>sandboxApple({}));
});
test('Apple official verifier rejects forged unsigned transactions',async()=>{
 const verifier=new SignedDataVerifier([],false,Environment.SANDBOX,'com.djayvo.app');
 await assert.rejects(verifier.verifyAndDecodeTransaction('eyJhbGciOiJub25lIn0.eyJ0cmFuc2FjdGlvbklkIjoiMTIzIn0.'));
});

test('Apple sandbox refund notifications verify both signatures and hold the exact consumable receipt',async()=>{
 const bundle='com.djayvo.app',id='11111111-1111-4111-8111-111111111111',held:string[]=[];
 let notice={version:'2.0',notificationUUID:id,notificationType:'REFUND',data:{bundleId:bundle,environment:Environment.SANDBOX,signedTransactionInfo:'signed-tx'}};
 let tx={environment:Environment.SANDBOX,bundleId:bundle,type:Type.CONSUMABLE,productId:'com.jamloom.credits.starter',transactionId:'receipt',revocationDate:1};
 const verifier={verifyAndDecodeNotification:async(jws:string)=>{assert.equal(jws,'signed-notice');return notice;},verifyAndDecodeTransaction:async(jws:string)=>{assert.equal(jws,'signed-tx');return tx;}};
 const wallet={freezePurchase:async(provider:string,receipt:string)=>{assert.equal(provider,'apple_sandbox');held.push(receipt);}};
 await reconcileAppleNotification(verifier,wallet,'signed-notice',bundle);assert.deepEqual(held,['receipt']);
 tx={...tx,bundleId:'wrong'};await assert.rejects(reconcileAppleNotification(verifier,wallet,'signed-notice',bundle));assert.equal(held.length,1);
 tx={...tx,bundleId:bundle,revocationDate:0};await assert.rejects(reconcileAppleNotification(verifier,wallet,'signed-notice',bundle));
 notice={...notice,notificationType:'REFUND_REVERSED'};assert.equal((await reconcileAppleNotification(verifier,wallet,'signed-notice',bundle)).manualReview,true);assert.equal(held.length,1);
 notice={...notice,data:{...notice.data,environment:Environment.PRODUCTION}};await assert.rejects(reconcileAppleNotification(verifier,wallet,'signed-notice',bundle));
 const official=new SignedDataVerifier([],false,Environment.SANDBOX,bundle);
 await assert.rejects(reconcileAppleNotification(official,wallet,'eyJhbGciOiJub25lIn0.e30.',bundle));
});
