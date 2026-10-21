import test from 'node:test';import assert from 'node:assert/strict';
import {Environment,SignedDataVerifier,Type} from '@apple/app-store-server-library';
import {applePurchase,sandboxApple} from '../lib/apple-payments';
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
