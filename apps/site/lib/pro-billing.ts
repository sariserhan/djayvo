import Stripe from 'stripe';
export function proBilling(env:Record<string,string|undefined>=process.env,mode=env.PRO_BILLING_MODE??'test'){
 if(!['test','live'].includes(mode))throw Error('Invalid Pro billing mode');
 const live=mode==='live',prefix=live?'PRO_STRIPE_LIVE_':'PRO_STRIPE_',key=live?env.STRIPE_LIVE_SECRET_KEY:env.STRIPE_SECRET_KEY;
 const price=env[prefix+'PRICE_ID'],product=env[prefix+'PRODUCT_ID'],secret=env[prefix+'WEBHOOK_SECRET'];
 if(!key?.startsWith(live?'sk_live_':'sk_test_')||!/^price_[A-Za-z0-9_]+$/.test(price??'')||!/^prod_[A-Za-z0-9_]+$/.test(product??'')||!secret?.startsWith('whsec_'))throw Error('Pro billing is not configured');
 return {stripe:new Stripe(key,{maxNetworkRetries:1,timeout:10000}),config:{price:price!,product:product!,live},secret:secret!,enabled:env.PRO_SALES_ENABLED==='true'};
}
