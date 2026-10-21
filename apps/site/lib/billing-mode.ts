import Stripe from 'stripe';
import type {BillingMode} from './site-settings';
import {paidGenerationReleased} from './product';
// Course release still requires curriculum, listening and real payment evidence.
export const academySalesReleased=false;
export function billingPublishableKey(mode:BillingMode,env:Record<string,string|undefined>=process.env){
 const key=mode==='test'?env.STRIPE_PUBLISHABLE_KEY:env.STRIPE_LIVE_PUBLISHABLE_KEY;
 return key?.startsWith(mode==='test'?'pk_test_':'pk_live_')?key:null;
}
export function billingEnvironment(mode:BillingMode,env:Record<string,string|undefined>=process.env){
 return mode==='test'?{key:env.STRIPE_SECRET_KEY,webhook:env.ACADEMY_STRIPE_WEBHOOK_SECRET,price:env.ACADEMY_STRIPE_PRICE_ID,product:env.ACADEMY_STRIPE_PRODUCT_ID}:
  {key:env.STRIPE_LIVE_SECRET_KEY,webhook:env.ACADEMY_STRIPE_LIVE_WEBHOOK_SECRET,price:env.ACADEMY_STRIPE_LIVE_PRICE_ID,product:env.ACADEMY_STRIPE_LIVE_PRODUCT_ID};
}
export function billingReadiness(mode:BillingMode,env:Record<string,string|undefined>=process.env){
 const c=billingEnvironment(mode,env),configured=!!c.key?.startsWith(mode==='live'?'sk_live_':'sk_test_')&&!!c.webhook?.startsWith('whsec_')&&/^price_[A-Za-z0-9_]+$/.test(c.price??'')&&/^prod_[A-Za-z0-9_]+$/.test(c.product??'');
 return {mode,configured,academyCheckoutEnabled:configured&&!!billingPublishableKey(mode,env)&&(mode==='test'?env.ACADEMY_STRIPE_SANDBOX_ENABLED==='true':academySalesReleased),generationCheckoutEnabled:paidGenerationReleased};
}
export function academyStripe(mode:BillingMode,env:Record<string,string|undefined>=process.env){
 if(!billingReadiness(mode,env).configured)throw new Error('Selected Stripe environment is incomplete');
 const c=billingEnvironment(mode,env);return {stripe:new Stripe(c.key!,{maxNetworkRetries:1,timeout:10000}),secret:c.webhook!,config:{price:c.price!,product:c.product!,live:mode==='live'}};
}
