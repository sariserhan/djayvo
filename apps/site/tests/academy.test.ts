import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import Stripe from 'stripe';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {AcademyStore} from '../lib/academy-store';
import {academyPaymentConfig,verifiedAcademyPrice,academyCheckout,grantAcademy,academyHold,academyWebhook} from '../lib/academy-payments';
const config={price:'price_academy',product:'prod_academy'};
const price={id:config.price,active:true,livemode:false,currency:'usd',unit_amount:7999,type:'one_time',tax_behavior:'exclusive',product:{id:config.product,active:true,metadata:{jamloom_product:'academy-complete'}}};
function receipt(id='cs_test_first',owner='alice'){return {id,livemode:false,mode:'payment',payment_status:'paid',client_reference_id:owner,payment_intent:'pi_'+id,currency:'usd',amount_subtotal:7999,total_details:{amount_discount:0},metadata:{jamloom_product:'academy-complete'},line_items:{data:[{quantity:1,amount_subtotal:7999,price}]}};}
function evidence(attemptId:string){return {attemptId,taskId:'play-a',evaluator:'academy-2',assets:['a','b'],samples:Array.from({length:24},(_,i)=>({t:1+i*.1,a:.1,b:0,x:0,master:.5,peak:.2,rms:.1,rateA:1,rateB:1,levelA:.8,levelB:.8})),actions:[{t:1,source:'user',control:'play-a',value:null}]};}
test('Academy catalog rejects wrong price, recurring, live and foreign products',async()=>{
 assert.deepEqual(academyPaymentConfig({ACADEMY_STRIPE_PRICE_ID:config.price,ACADEMY_STRIPE_PRODUCT_ID:config.product}),config);
 assert.throws(()=>academyPaymentConfig({}),/not configured/);
 const sdk=(p:any)=>({prices:{retrieve:async()=>p}} as unknown as Stripe);
 assert.equal((await verifiedAcademyPrice(sdk(price),config)).unit_amount,7999);
 for(const bad of [{unit_amount:7900},{livemode:true},{active:false},{type:'recurring'},{currency:'eur'},{tax_behavior:'inclusive'},{product:'prod_else'}])await assert.rejects(verifiedAcademyPrice(sdk({...price,...bad}),config));
 const stripe=new Stripe('sk_test_fixture'),payload=JSON.stringify({id:'evt_signature',livemode:false});
 const signature=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'});
 assert.equal(stripe.webhooks.constructEvent(payload,signature,'whsec_fixture').id,'evt_signature');
 assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',signature,'whsec_fixture'));
});
test('isolated Postgres Academy receipts, progress, holds and tenant boundaries',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_academy_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),store=new AcademyStore(pool);let current:any=receipt(),disputeStatus='needs_response';let checkoutBody:any;
 const sdk={prices:{retrieve:async()=>price},checkout:{sessions:{retrieve:async()=>current,list:async()=>({has_more:false,data:[current]}),create:async(body:any)=>{checkoutBody=body;return {id:'cs_test_create'};}}},disputes:{retrieve:async()=>({livemode:false,payment_intent:current.payment_intent,status:disputeStatus})}} as unknown as Stripe;
 try{await migrate(pool);assert.deepEqual(await migrate(pool),[]);for(const id of ['alice','bob'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,id+'@example.test']);
 await t.test('server catalog checkout is one-time, taxed, owner-bound and separate from credit packs',async()=>{
  await academyCheckout(sdk,pool,'alice','checkout_key','http://127.0.0.1:4223',config);assert.equal(checkoutBody.client_reference_id,'alice');assert.deepEqual(checkoutBody.line_items,[{price:config.price,quantity:1}]);assert.equal(checkoutBody.automatic_tax.enabled,true);assert.equal(checkoutBody.metadata.pack,undefined);assert.equal(checkoutBody.ui_mode,'embedded_page');assert.equal(checkoutBody.redirect_on_completion,'never');assert.equal(checkoutBody.success_url,undefined);assert.equal(checkoutBody.cancel_url,undefined);assert.equal(checkoutBody.return_url,undefined);
 });
 await t.test('parallel receipt delivery grants once, denies owner transfer, never mints credits',async()=>{
  await Promise.all(Array.from({length:5},()=>grantAcademy(sdk,pool,current.id,config)));assert.equal(await store.access('alice'),true);assert.equal(await store.access('bob'),false);
  assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  await assert.rejects(academyCheckout(sdk,pool,'alice','checkout_key','http://127.0.0.1:4223',config),/already active/);
  current={...current,client_reference_id:'bob'};await assert.rejects(grantAcademy(sdk,pool,current.id,config),/conflict/);current=receipt();
 });
 await t.test('refund before grant, duplicate refund, repurchase and independent dispute holds',async()=>{
  await academyHold(pool,current.id,'refund');await academyHold(pool,current.id,'refund');assert.equal(await store.access('alice'),false);
  current=receipt('cs_test_refundfirst');await academyHold(pool,current.id,'refund');await grantAcademy(sdk,pool,current.id,config);assert.equal(await store.access('alice'),false);
  current=receipt('cs_test_repurchase');await grantAcademy(sdk,pool,current.id,config);assert.equal(await store.access('alice'),true);
  await academyHold(pool,current.id,'dispute');assert.equal(await store.access('alice'),false);await academyHold(pool,current.id,'dispute',false);assert.equal(await store.access('alice'),true);
  await assert.rejects(academyHold(pool,current.id,'refund',false));
 });
 await t.test('authoritative unpaid/live/price evidence cannot grant',async()=>{
  for(const bad of [{payment_status:'unpaid'},{livemode:true},{amount_subtotal:1},{currency:'eur'},{total_details:{amount_discount:1}},{line_items:{data:[]}}]){current={...receipt('cs_test_invalid'),...bad};await assert.rejects(grantAcademy(sdk,pool,current.id,config));}
  assert.equal((await pool.query("SELECT count(*)::int n FROM academy_purchases WHERE receipt='cs_test_invalid'")).rows[0].n,0);current=receipt('cs_test_webhook');
 });
 await t.test('webhook replay conflicts and stale dispute events use current provider status',async()=>{
  const evt={id:'evt_academy_test',livemode:false,type:'checkout.session.completed',data:{object:current}} as Stripe.Event;const raw=JSON.stringify(evt);
  await Promise.all(Array.from({length:5},()=>academyWebhook(sdk,pool,evt,raw,config)));await academyWebhook(sdk,pool,evt,raw,config);await assert.rejects(academyWebhook(sdk,pool,evt,raw+' ',config),/replay conflict/);
  await assert.rejects(academyWebhook(sdk,pool,{...evt,livemode:true},raw,config),/environment mismatch/);
  const disputed={id:'evt_dispute',livemode:false,type:'charge.dispute.created',data:{object:{id:'dp_local',payment_intent:current.payment_intent}}} as Stripe.Event;
  await academyWebhook(sdk,pool,disputed,JSON.stringify(disputed),config);assert.equal((await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[current.id])).rows[0].dispute_hold,true);
  disputeStatus='won';await academyWebhook(sdk,pool,{...disputed,id:'evt_stale_dispute'},'stale',config);assert.equal((await pool.query('SELECT dispute_hold FROM academy_purchases WHERE receipt=$1',[current.id])).rows[0].dispute_hold,false);
 });
 await t.test('shared-account reversals ignore unrelated direct charges and products, but reject ambiguous sessions',async()=>{
  const before=(await pool.query('SELECT count(*)::int n FROM academy_purchase_holds')).rows[0].n;
  for(const [index,data]of [[],[{metadata:{jamloom_product:'other'}}]].entries()){
   const event={id:'evt_unrelated_'+index,livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_other'}}} as Stripe.Event;
   const other={checkout:{sessions:{list:async()=>({has_more:false,data})}}} as unknown as Stripe;
   await academyWebhook(other,pool,event,JSON.stringify(event),config);assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchase_events WHERE event_id=$1',[event.id])).rows[0].n,1);
  }
  assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchase_holds')).rows[0].n,before);
  const legacy={id:'evt_legacy_charge',livemode:false,type:'charge.refunded',data:{object:{payment_intent:null}}} as Stripe.Event;
  await academyWebhook({} as Stripe,pool,legacy,JSON.stringify(legacy),config);assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchase_events WHERE event_id=$1',[legacy.id])).rows[0].n,1);
  const ambiguous={checkout:{sessions:{list:async()=>({has_more:true,data:[]})}}} as unknown as Stripe;
  await assert.rejects(academyWebhook(ambiguous,pool,{id:'evt_ambiguous',livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_other'}}} as Stripe.Event,'ambiguous',config),/Ambiguous/);
 });
 await t.test('progress reevaluates signals and task order, isolates owners and survives a new store',async()=>{
  await assert.rejects(store.begin('bob','gain-staging'),/pass required/);await assert.rejects(store.begin('alice','gain-staging'),/prerequisite/);
  const id=await store.begin('alice','first-crossfade'),data=evidence(id);await pool.query("UPDATE academy_attempts SET started_at=now()-interval '1 minute' WHERE id=$1",[id]);
  await assert.rejects(store.submit('bob',data,['a','b']),/Unknown/);await assert.rejects(store.submit('alice',{...data,taskId:'fade'},['a','b']),/order/);
  await assert.rejects(store.submit('alice',{...data,actions:[{t:1,source:'coach_demo',control:'play-a'}]},['a','b']),/Your turn/);
  await assert.rejects(store.submit('alice',{...data,assets:['changed']},['a','b']),/Invalid/);
  await store.submit('alice',data,['a','b']);await store.submit('alice',data,['a','b']);await assert.rejects(store.submit('alice',{...data,extra:'changed'},['a','b']),/replay conflict/);
  const b={...data,taskId:'play-b',samples:data.samples.map(s=>({...s,t:s.t+5,b:.1})),actions:[{t:6,source:'user',control:'play-b',value:null}]};await store.submit('alice',b,['a','b']);
  const fade={...data,taskId:'fade',samples:Array.from({length:46},(_,i)=>({...data.samples[0],t:10+i*.1,a:.1,b:.1,x:Math.min(1,Math.max(0,(i-2)/40))})),actions:Array.from({length:40},(_,i)=>({t:10.3+i*.1,source:'user',control:'crossfade',value:(i+1)/40}))};
  assert.equal((await store.submit('alice',fade,['a','b'])).completed,true);assert.ok(await store.begin('alice','gain-staging'));
  assert.ok((await new AcademyStore(pool).progress('alice')).some(a=>a.checks.length===3&&a.completed_at));assert.equal((await store.progress('bob')).length,0);
  const expired=await store.begin('alice','first-crossfade');await pool.query("UPDATE academy_attempts SET expires_at=now()-interval '1 second' WHERE id=$1",[expired]);await assert.rejects(store.submit('alice',evidence(expired),['a','b']),/expired/);
  await store.removeProgress('alice');assert.deepEqual(await store.progress('alice'),[]);assert.equal(await store.access('alice'),true);
 });
 await t.test('bounded history and daily sync quota survive deleting learning progress',async()=>{
  for(let i=0;i<25;i++)await store.begin('bob','first-crossfade');assert.equal((await store.progress('bob')).length,20);
  await pool.query('UPDATE academy_daily_usage SET attempts=100 WHERE owner_id=$1',['bob']);await store.removeProgress('bob');await assert.rejects(store.begin('bob','first-crossfade'),/Daily/);
 });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});

test('published manifests are bounded, versioned and have unambiguous prerequisites',async()=>{
 const {academyLessons}=await import('../lib/academy-content');const {validateLesson}=await import('../../web/academy-manifest.js');
 for(const lesson of academyLessons){assert.equal(validateLesson(lesson),lesson);for(const id of lesson.prerequisites)assert.ok(academyLessons.some(l=>l.id===id));
  assert.throws(()=>validateLesson({...lesson,version:'future'}));assert.throws(()=>validateLesson({...lesson,tasks:[lesson.tasks[0],lesson.tasks[0]]}));
 }
});

test('Academy modeled contribution is explicit, bounded and never finances AI inference',async()=>{
 const {academyContribution}=await import('../lib/academy-economics');const model=academyContribution();assert.ok(model.contribution>0);assert.equal(model.cloudInferenceRequests,0);
 assert.equal(academyContribution({supportReserveCents:8000}).positive,false);assert.throws(()=>academyContribution({processorBps:NaN}));
});

test('all six stages have runnable assessments and final completion traverses the entire curriculum',async()=>{
 const {academyLessons,academyLevels}=await import('../lib/academy-content');
 for(const level of academyLevels)assert.ok(academyLessons.some(l=>l.level===level.slug&&(l.assessment||l.free)),level.slug);
 const visited=new Set<string>(),active=new Set<string>();
 function walk(id:string){assert.ok(!active.has(id),'prerequisite cycle');if(visited.has(id))return;active.add(id);const lesson=academyLessons.find(l=>l.id===id);assert.ok(lesson);for(const p of lesson.prerequisites)walk(p);active.delete(id);visited.add(id);}
 walk('performance-set');assert.equal(visited.size,academyLessons.length);
 assert.equal(academyLessons.find(l=>l.id==='performance-set')!.tasks[0].seconds,1800);
 assert.equal(academyLessons.find(l=>l.id==='intermediate-set')!.tasks[0].seconds,300);
});
